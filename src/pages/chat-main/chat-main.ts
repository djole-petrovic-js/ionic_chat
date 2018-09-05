import { Component } from '@angular/core';
import { Events, AlertController } from 'ionic-angular';
import { APIService } from '../../services/api.service';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
import { FriendsService } from '../../services/friends.service';
import { SocketService } from '../../services/socket.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { TokenService } from '../../services/token.service';
import { AuthenticationService } from '../../services/authentication.service';
import { Platform,ToastController } from 'ionic-angular';
import { App } from "ionic-angular/index";
import { Subscription } from 'rxjs';

@Component({
  selector: 'page-chat-main',
  templateUrl: 'chat-main.html',
  providers:[ErrorResolverService,TokenService]
})
export class ChatMain {
  private notifications;
  private friends;
  private pendingRequests;
  private loading:boolean;
  private unreadMessages = {};
  private backBtnExitApp:boolean = false;
  private onResumeSubscription = null;

  constructor (
    private apiService:APIService,
    private events:Events,
    private notificationsService:NotificationsService,
    private messagesService:MessagesService,
    private socketService:SocketService,
    private friendsService:FriendsService,
    private errorResolverService:ErrorResolverService,
    private alertController:AlertController,
    private tokenService:TokenService,
    private authenticationService:AuthenticationService,
    private platform:Platform,
    private app:App,
    private toastController:ToastController
  ) {
    this.loading = true;
    this.tokenService.startRefreshing();

    this.platform.ready().then(() => {
      this.platform.registerBackButtonAction(this.onBackBtnClick.bind(this));

      if ( !this.onResumeSubscription ) {
        this.onResumeSubscription = this.platform.resume.subscribe(this.onResume.bind(this));
      }
    });
    
    this.events.subscribe('friends:user-confirmed',this.friendUserConfirmed.bind(this));
    this.events.subscribe('message:stored-unread-message',this.storedUnreadMessage.bind(this));
    this.events.subscribe('friend:friend-you-removed',this.friendYouRemoved.bind(this));
    this.events.subscribe('friend:login',this.friendLogIn.bind(this));
    this.events.subscribe('friend:logout',this.friendLogOut.bind(this));
  }

  private async onResume() {
    const loggedIn = await this.tokenService.checkStatusOnResume();

    if ( !loggedIn ) {
      await this.authenticationService.logOut();
      this.events.publish('user:logout');
    }
  }

  private onBackBtnClick() {
    const overlay = this.app._appRoot._overlayPortal.getActive();
    const nav = this.app.getActiveNav();

    if(overlay && overlay.dismiss) {
      return overlay.dismiss();
    }

    if(nav.canGoBack()) {
      return nav.pop();
    }

    if ( this.backBtnExitApp ) {
      this.platform.exitApp();
    } else {
      const toast = this.toastController.create({
        duration:2000,
        position:'bottom',
        message:'Tap again to exit.'
      });

      toast.present();
      this.backBtnExitApp = true;
      setTimeout(() => this.backBtnExitApp = false,1500);
    }
  }

  private async friendUserConfirmed() {
    try {
      this.friends = await this.friendsService.getFriends();
      this.pendingRequests = await this.friendsService.getPendingRequets();
    } catch(e) {
      this.errorResolverService.presentAlertError('Confirm Friend',e.errorCode);
    }
  }

  private storedUnreadMessage() {
    this.unreadMessages = this.messagesService.getUnreadMessages();
  }

  private friendYouRemoved(data) {
    this.friends.splice(this.friends.find(x => x.id_user === data.IdUserRemoving),1)
  }

  private friendLogIn(data) {
    this.friends.find(x => x.id_user === data.friendID).online = 1;
  }

  private friendLogOut(data) {
    this.friends.find(x => x.id_user === data.friendID).online = 0;
  }

  private async ionViewDidLoad() {
    try {
      await this.socketService.getConnection();

      if ( !this.socketService.getSocket().connected ) {
        throw new Error('Not connected');
      }
    } catch(e) {
      const alert = this.alertController.create({
        title:'Fatal Error',
        message:'Could not establish connection to the server. Please restart your application!',
        buttons:['OK']
      })

      alert.present();
    } finally {
      this.loading = false;
    }

    try {
      [this.friends,this.notifications,this.pendingRequests] = await Promise.all([
        this.friendsService.getFriends(),
        this.notificationsService.getNotifications(),
        this.friendsService.getPendingRequets()
      ]);

      await this.messagesService.getInitialMessages();
      this.unreadMessages = this.messagesService.getUnreadMessages();
    } catch(err) {
      this.errorResolverService.presentAlertError('Error',err.statusCode);
    } finally {
      this.loading = false;
    }
  }

  private startChatting(userOptions):void {
    this.events.publish('start:chatting',userOptions);
  }

  ionViewWillLeave() {
    this.events.unsubscribe('friend:login');
    this.events.unsubscribe('friend:logout');
    this.events.unsubscribe('friends:user-confirmed');
    this.events.unsubscribe('friend:friend-you-removed');
    this.events.unsubscribe('message:stored-unread-message');
  }

  private async cancelRequest(idUser:number) {
    try {
      await this.friendsService.cancelRequest(idUser);

      this.pendingRequests = await this.friendsService.getPendingRequets();
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.errorCode);
    }
  }

  private dismissNotification(notificationID):void {
    this
      .apiService
      .dismissNotification(notificationID)
      .subscribe((res) => {
        if ( res.success !== true ) {
          this.errorResolverService.presentAlertError('Error',res.errorCode);
        } else {
          this.notifications = this.notificationsService.dismissNotification(notificationID);
        }
      },(err) => {
        this.errorResolverService.presentAlertError('Error',err.errorCode);
      });
  }

  private dismissAllNotifications():void {
    this
      .apiService
        .dismissAllNotifications()
        .subscribe((res) => {
          this.notifications = [];
          this.notificationsService.dismissAll();
        },(err) => {
          this.errorResolverService.presentAlertError('Error',err.errorCode);
        });
  }

  private confirmFriendRequest(id_user:string,notificationID:string):void {
    this
      .apiService
      .confirmFriendRequest(id_user)
      .subscribe((res) => {
        if ( res.success === true ) {
          const alert = this.alertController.create({
            title:'Success',
            subTitle:'Successfully confirmed!',
            buttons:['dismiss']
          });

          alert.present();

          this.notifications = this.notificationsService.dismissNotification(notificationID);
          this.dismissNotification(notificationID);
        } else {
          this.errorResolverService.presentAlertError('Error',res.errorCode);
        }
      },(err) => {
        this.errorResolverService.presentAlertError('Error',err.errorCode);
      });
  }
}