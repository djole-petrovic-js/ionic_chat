import { Component, NgZone } from '@angular/core';
import { Events, AlertController, Alert } from 'ionic-angular';
import { APIService } from '../../services/api.service';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
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
import { SecureDataStorage } from '../../Libs/SecureDataStorage';

@Component({
  selector: 'page-chat-main',
  templateUrl: 'chat-main.html',
})
export class ChatMain {
  private notifications;
  private friends;
  private pendingRequests;
  private unreadMessages = {};
  private backBtnExitApp:boolean = false;
  private onResumeSubscriber:Subscription;
  private onPauseSubscriber:Subscription;
  private onConnectSubscriber:Subscription;
  private onDisconnectSubscriber:Subscription;
  private backButtonDeregister:Function;
  private disconnectAlert:Alert;

  constructor (
    private networkService:NetworkService,
    private apiService:APIService,
    private events:Events,
    private notificationsService:NotificationsService,
    private messagesService:MessagesService,
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
    private zone:NgZone
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

        this.onConnectSubscriber = Network.onConnect().subscribe(this.onConnect.bind(this));
        this.onDisconnectSubscriber = Network.onDisconnect().subscribe(this.onDisconnect.bind(this));
        
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

  private subscribeEvents() {
    this.events.subscribe('message:stored-unread-message',this.storedUnreadMessage.bind(this));
    this.events.subscribe('friend_you_removed',this.friendYouRemoved.bind(this));
    this.events.subscribe('friend:login',this.friendLogIn.bind(this));
    this.events.subscribe('friend:logout',this.friendLogOut.bind(this));
  }

  private unSubscribeEvents() {
    this.events.unsubscribe('friend:login');
    this.events.unsubscribe('friend:logout');
    this.events.unsubscribe('friend_you_removed');
    this.events.unsubscribe('message:stored-unread-message');
  }

  private _loadingOnReconnect;

  private async onConnect() {
    this.zone.run(async() => {
      if ( this.disconnectAlert ) {
        await this.disconnectAlert.dismiss();
      }
  
      if ( this._loadingOnReconnect ) {
        await this._loadingOnReconnect.dismiss();
      }
  
      try {
        this._loadingOnReconnect = this.loadingController.create({
          spinner:'bubbles',
          content:'Reconnecting...',
          duration:7000
        });
  
        this.socketService.getSocket().connect();
        await this._loadingOnReconnect.present();
        await this.platform.ready();
        await this.tokenService.checkLoginStatus();
        await this.socketService.getConnection();
        const { operations } = await this.apiService.getSocketOperations();
        await this.apiService.deleteOperations({  });
        await this.socketService.executeSocketOperations(operations);
  
        const toast = this.toastController.create({
          duration:3000,
          position:'top',
          message:'Reconnection successful!'
        });
  
        await toast.present();
      } catch(e) {
        if ( !BackgroundMode.isActive() ) {
          this.errorResolverService.presentAlertError('Reconnecting Error',e.errorCode);
        }
      } finally {
        if ( this._loadingOnReconnect ) { this._loadingOnReconnect.dismiss(); }
      }
    });
  }

  private async onDisconnect() {
    if ( this._loadingOnReconnect ) {
      await this._loadingOnReconnect.dismiss();
    }

    if ( BackgroundMode.isActive() ) return;

    this.socketService.getSocket().disconnect();

    this.disconnectAlert = this.alertController.create({
      title:'Connection Error',
      message:'No internet connection.',
      buttons:['OK']
    });

    await this.disconnectAlert.present();
  }

  private async onPause():Promise<void> {
    this.tokenService.stopRefreshing();
  }

  private async onResume():Promise<void> {
    await this.platform.ready();

    if ( !this.networkService.hasInternetConnection() ) {
      const toast = this.toastController.create({
        duration:3000,
        position:'top',
        message:'No Internet Connection!'
      });
  
      return toast.present();
    }

    try {
      await this.tokenService.checkLoginStatus();
      this.tokenService.startRefreshing();
      await this.socketService.executeSocketOperations();
    } catch(e) {
      await this.onConnect();
    }
  }

  private async onBackBtnClick() {
    const overlay = this.app._appRoot._overlayPortal.getActive();
    const nav = this.app.getActiveNav();

    if ( overlay && overlay.dismiss ) {
      return overlay.dismiss();
    }

    if ( nav.canGoBack() ) {
      return nav.pop();
    }

    if ( this.backBtnExitApp ) {
      await this.platform.ready();

      const loading = this.loadingController.create({
        spinner:'bubbles',
        content:'Deleting messages and exitting...'
      });

      await loading.present();

      try {
        await Promise.all([
          SecureDataStorage.Instance().remove('messages'),
          SecureDataStorage.Instance().remove('unreadMessages')
        ]);
      } catch(e) { }

      if ( this.networkService.hasInternetConnection() ) {
        try {
          await this.apiService.changeLoginStatus({ status:0 });
        } catch(e) { }
      }

      await loading.dismiss();

      this.platform.exitApp();
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

  private storedUnreadMessage() {
    this.unreadMessages = this.messagesService.getUnreadMessages();
  }

  private friendYouRemoved(data) {
    const friendIndex = this.friends.findIndex(x => x.id_user === data.IdUserRemoving);

    if ( friendIndex !== -1 ) {
      this.friends.splice(friendIndex,1);
    }
  }

  private friendLogIn(data) {
    try {
      this.friends.find(x => x.id_user === data.friendID).online = 1;
    } catch(e) { }
  }

  private friendLogOut(data) {
    try {
      this.friends.find(x => x.id_user === data.friendID).online = 0;
    } catch(e) { }
  }

  private async loadData() {
    try {
      [this.friends,this.notifications,this.pendingRequests] = await Promise.all([
        this.friendsService.getFriends(),
        this.notificationsService.getNotifications(),
        this.friendsService.getPendingRequets(),
        this.settingsService.fetchSettings()
      ]);

      await this.messagesService.getInitialMessages();
      this.unreadMessages = this.messagesService.getUnreadMessages();
    } catch(e) {
      throw e;
    }
  }

  private async ionViewWillEnter() {
    this.subscribeEvents();

    if ( this.networkService.hasInternetConnection() ) {
      let loading;

      try {
        if ( this.settingsService.shouldDisplayMainLoadingScreen() ) {
          this.settingsService.toggleMainLoadingScreen();

          loading = this.loadingController.create({
            spinner:'bubbles',
            content:'Loading Data...'
          });
          
          await loading.present();
        }
        
        await this.loadData();
        await this.socketService.getConnection();
      } catch(err) {
        this.errorResolverService.presentAlertError('Error',err.statusCode);
      } finally {
        if ( loading ) { loading.dismiss(); }
      }
    }
  }

  private async ionViewWillLeave() {
    this.unSubscribeEvents();
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