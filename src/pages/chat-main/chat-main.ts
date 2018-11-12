import { Component, NgZone } from '@angular/core';
import { Events, AlertController, Alert, NavController } from 'ionic-angular';
import { APIService } from '../../services/api.service';
import { NotificationsService } from '../../services/notifications.service';
import { FriendsService } from '../../services/friends.service';
import { SocketService } from '../../services/socket.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { TokenService } from '../../services/token.service';
import { SettingsService } from '../../services/settings.service';
import { Platform,ToastController } from 'ionic-angular';
import { BackgroundMode, Network } from 'ionic-native';
import { App, LoadingController } from "ionic-angular/index";
import { Subscription } from 'rxjs';
import { NetworkService } from '../../services/network.service';
import { FCM } from '@ionic-native/fcm';
import { AppService } from '../../services/app.service';
import { Config } from '../../Libs/Config';
import { MessagesService } from '../../services/messages.service';
import { LockScreenComponent } from 'ionic-simple-lockscreen';

@Component({
  selector: 'page-chat-main',
  templateUrl: 'chat-main.html',
})
export class ChatMain {
  private notifications;
  private friends;
  private pendingRequests;
  private backBtnExitApp:boolean = false;
  private exittingStarted:boolean = false;
  private deviceLocked:boolean = false;
  private shouldAlertIfPINIsMissing:boolean = true;
  private shouldInitializeSocket:boolean = true;
  private onResumeSubscriber:Subscription;
  private onPauseSubscriber:Subscription;
  private onConnectSubscriber:Subscription;
  private onDisconnectSubscriber:Subscription;
  private backButtonDeregister:Function;
  private disconnectAlert:Alert;
  private unreadMessages = {};

  constructor (
    private networkService:NetworkService,
    private apiService:APIService,
    private events:Events,
    private notificationsService:NotificationsService,
    private socketService:SocketService,
    private friendsService:FriendsService,
    private errorResolverService:ErrorResolverService,
    private alertController:AlertController,
    private tokenService:TokenService,
    private settingsService:SettingsService,
    private platform:Platform,
    private app:App,
    private toastController:ToastController,
    private loadingController:LoadingController,
    private zone:NgZone,
    private fcm:FCM,
    private appService:AppService,
    private messagesService:MessagesService,
    private navController:NavController,
  ) {
    this.tokenService.startRefreshing();

    this.platform.ready().then(() => {
      // if settings are loaded, that means we are not on this page first time
      // so dont register callbacks twice...
      if ( !this.settingsService.areSettingsLoaded() ) {
        this.events.subscribe('user:logout',() => {
          this.onPauseSubscriber.unsubscribe();
          this.onResumeSubscriber.unsubscribe();
          this.onConnectSubscriber.unsubscribe();
          this.onDisconnectSubscriber.unsubscribe();
          this.backButtonDeregister();
        });

        this.tokenService.startCashing();
        this.initFCM();
        this.onConnectSubscriber = Network.onConnect().subscribe(this.onConnect.bind(this));

        this.onDisconnectSubscriber = Network.onDisconnect().subscribe(() => {
          setTimeout(async() => {
            const isConnected = await this.networkService.heartbeat();

            if ( !isConnected ) {
              this.onDisconnect();
            }
          }, 3000);
        });
        
        BackgroundMode.configure({
          title:'No History Chat',
          text:'Running in background...',
          silent:true
        });

        BackgroundMode.setDefaults({
          title:'No History Chat',
          text:'Running in background...',
          silent:true
        });

        BackgroundMode.enable();
        this.backButtonDeregister = this.platform.registerBackButtonAction(() => this.onBackBtnClick());
        this.onPauseSubscriber = this.platform.pause.subscribe(() => this.onPause());
        this.onResumeSubscriber = this.platform.resume.subscribe(() => this.onResume());
      }
    });
  }

  private async initFCM() {
    if ( Config.getConfig('IS_PRODUCTION') ) {
      const token = await this.fcm.getToken();

      await this.tokenService.setFCMToken(token)

      this.fcm.onTokenRefresh().subscribe(async(token) => {
        await this.tokenService.setFCMToken(token)
      });
    }
  }

  private async onConnect() {
    this.zone.run(async() => {
      const isInBackground = BackgroundMode.isActive();

      try {
        if ( this.disconnectAlert ) {
          await this.disconnectAlert.dismiss();
        }
        
        this.socketService.getSocket().disconnect();
        await this.platform.ready();
        await this.tokenService.checkLoginStatus();
        this.socketService.getSocket().connect();
        await this.socketService.getConnection();
      } catch(e) {
        if ( !isInBackground ) {
          this.errorResolverService.presentAlertError('Reconnecting Error',e.errorCode);
        }
      }
    });
  }

  private async onDisconnect() {
    if ( BackgroundMode.isActive() ) return;

    this.disconnectAlert = this.alertController.create({
      title:'Connection Error',
      message:'No internet connection.',
      buttons:['OK']
    });

    this.disconnectAlert.present();
  }

  private async onPause():Promise<void> {
    const isOnWiFi:boolean = await this.networkService.connectedViaWiFi();

    if ( !isOnWiFi ) {
      this.socketService.getSocket().disconnect();
    }

    if ( this.settingsService.isPINUnlockDeviceSetSync() ) {
      this.showPINUnlockForm();
    }

    this.tokenService.stopRefreshing();
    this.appService.startClosingTimeout();
  }

  private async onResume():Promise<void> {
    await this.platform.ready();

    this.appService.stopClosingTimeout();
    this.tokenService.startRefreshing();
    this.socketService.getSocket().connect();

    const isConnected = await this.networkService.heartbeat();

    if ( !isConnected ) {
      const toast = this.toastController.create({
        duration:3000,
        position:'top',
        message:'No Internet Connection!'
      });
  
      return toast.present();
    }

    try {
      await this.tokenService.checkLoginStatus();
    } catch(e) {
      await this.onConnect();
    }
  }

  private async onBackBtnClick() {
    if ( this.deviceLocked ) {
      await this.apiService.changeLoginStatus({ status:0 });

      this.platform.exitApp();
    }

    const overlay = this.app._appRoot._overlayPortal.getActive();
    const nav = this.app.getActiveNav();

    if ( overlay && overlay.dismiss ) {
      return overlay.dismiss();
    }

    if ( nav.canGoBack() ) {
      return nav.pop();
    }

    if ( this.backBtnExitApp ) {
      if ( this.exittingStarted ) return;

      this.exittingStarted = true;
      await this.platform.ready();

      const loading = this.loadingController.create({
        spinner:'bubbles',
        content:'Deleting messages and exitting...'
      });

      await loading.present();

      try {
        await this.tokenService.checkLoginStatus();

        await Promise.all([
          this.apiService.changeLoginStatus({ status:0 }),
          this.messagesService.deleteMessages()
        ]);

        await loading.dismiss();

        this.platform.exitApp();
      } catch(e) {
        await loading.dismiss();

        this.alertController.create({
          title:'Error occured',
          message:`Error occured while trying to delete your messages. Check your internet connection,  
          restart the application and try again.`,
          buttons:[{
            text:'OK',
            role:'cancel',
            handler:() => { this.platform.exitApp(); }
          }]
        }).present();
      }
    } else {
      const toast = this.toastController.create({
        duration:2000,
        position:'bottom',
        message:'Tap again to exit.'
      });

      toast.present();
      this.backBtnExitApp = true;
      setTimeout(() => this.backBtnExitApp = false,3000);
    }
  }

  private async showPINUnlockForm(callback?:Function) {
    if ( this.appService.getActivePage().component === LockScreenComponent ) return;

    this.deviceLocked = true;

    this.navController.push(LockScreenComponent,{
      code:this.settingsService.getPINUnlockDeviceSync(),
      ACDelbuttons:true,
      passcodeLabel: 'Enter PIN To Unlock Device',
      onCorrect:() => {
        this.deviceLocked = false;

        if ( callback && typeof callback === 'function' ) {
          callback();
        }
      },
      onWrong:async(attempts) => {
        if ( 5 - attempts === 0 ) {
          const loading = this.loadingController.create({
            spinner:'bubbles', content:'Loging out...'
          });

          loading.present();

          await this.apiService.logOut();
          await loading.dismiss();

          this.platform.exitApp();
        } else {
          this.alertController.create({
            title:'Incorrect PIN',
            message:`${5 - attempts} attempts remaining.`,
            buttons:['OK']
          }).present();
        }
      }
    });
  }

  private async loadData():Promise<void> {
    try {
      [this.friends,this.notifications,this.pendingRequests] = await Promise.all([
        this.friendsService.getFriends(),
        this.notificationsService.getNotifications(),
        this.friendsService.getPendingRequets(),
        this.settingsService.fetchSettings()
      ]);

      if ( this.shouldInitializeSocket ) {
        await this.socketService.getConnection();
        this.shouldInitializeSocket = false;
      }
  
      this.unreadMessages = this.messagesService.getUnreadMessages();
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.statusCode);
    }
  }

  private async ionViewWillEnter() {
    if ( !Config.getConfig('IS_PRODUCTION') ) {
      return this.loadData();
    }

    if ( this.appService.shoudAskForPIN() ) {
      this.appService.setShouldAskForPIN(false);
      const settings = await this.settingsService.fetchSettings();

      if ( !settings.pin_unlock_device_enabled ) {
        return this.loadData();
      }

      const isPINSet:boolean = await this.settingsService.isPINUnlockDeviceSet();
      
      if ( isPINSet ) {
        this.showPINUnlockForm(async() => {
          await this.loadData();
        });
      } else {
        await this.apiService.setBinarySettings({
          setting:'pin_unlock_device_enabled',
          value:0
        });

        this.settingsService.setSetting('pin_unlock_device_enabled',0);

        await this.apiService.logOut();
        this.events.publish('user:logout');

        this.alertController.create({
          title:'PIN For Unlock Not Found',
          message:`PIN for unlocking this device is not found. Log in to application and set a new one.`,
          buttons:['OK']
        }).present();
      }
    } else {
      this.loadData();

      if ( this.shouldAlertIfPINIsMissing ) {
        this.shouldAlertIfPINIsMissing = false;

        const settings = await this.settingsService.fetchSettings();
        const isPINSet:boolean = await this.settingsService.isPINUnlockDeviceSet();

        if ( settings.pin_unlock_device_enabled && !isPINSet ) {
          this.alertController.create({
            title:'PIN For Unlock Not Found',
            message:`PIN for unlocking this device is not found. Please navigate to settings page and set a new one.`,
            buttons:['OK']
          }).present();

          await this.apiService.setBinarySettings({
            setting:'pin_unlock_device_enabled',
            value:0
          });

          this.settingsService.setSetting('pin_unlock_device_enabled',0);
        }
      }
    }
  }

  private startChatting(userOptions):void {
    this.events.publish('start:chatting',userOptions);
  }

  private async cancelRequest(idUser:number) {
    try {
      await this.friendsService.cancelRequest(idUser);

      this.friendsService.removePendingRequest({ friend:{ id_user:idUser } });
      this.pendingRequests = await this.friendsService.getPendingRequets();
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.errorCode);
    }
  }

  private dismissNotification(notificationID):void {
    this
      .apiService
      .dismissNotification(notificationID)
      .subscribe((response) => {
        if ( response.success ) {
          this.notifications = this.notificationsService.dismissNotification(notificationID);
        } else {
          this.errorResolverService.presentAlertError('Error',response.errorCode);
        }
      },(err) => {
        this.errorResolverService.presentAlertError('Error',err.errorCode);
      });
  }

  private dismissAllNotifications():void {
    this
      .apiService
        .dismissAllNotifications()
        .subscribe(() => {
          this.notifications = [];
          this.notificationsService.dismissAll();
        },(err) => {
          this.errorResolverService.presentAlertError('Error',err.errorCode);
        });
  }

  private async confirmFriendRequest(id_user:string,notificationID:string) {
    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Confirming friend request...'
    });

    await loading.present();

    this
      .apiService
      .confirmFriendRequest(id_user)
      .subscribe(async(response) => {
        await loading.dismiss();

        if ( response.success ) {
          this.notifications = this.notificationsService.dismissNotification(notificationID);
          this.dismissNotification(notificationID);
        } else {
          this.errorResolverService.presentAlertError('Error',response.errorCode);
        }
      },async () => {
        await loading.dismiss();

        const alert = this.alertController.create({
          title:'Error occured',
          subTitle:'Error occured while trying to confirm this friend request. It seems like it has been canceled...',
          buttons:['OK']
        });

        await alert.present();
      });
  }
}