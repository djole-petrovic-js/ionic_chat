import { Component } from '@angular/core';
import { NavController, NavParams , Events } from 'ionic-angular';

import { APIService } from '../../services/api.service';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
import { FriendsService } from '../../services/friends.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'page-chat-main',
  templateUrl: 'chat-main.html'
})
export class ChatMain {
  private notifications;
  private socket;

  constructor (
    private navCtrl: NavController,
    private navParams: NavParams,
    private apiService:APIService,
    private events:Events,
    private notificationsService:NotificationsService,
    private messagesService:MessagesService,
    private socketService:SocketService,
    private friendsService:FriendsService
  ) {
    this.notifications = [];

    this.socketService.getConnection().then((socket) => {
      this.socket = socket;
    });

    this.friendsService.getFriends();
    this.messagesService.getInitialMessages();
  }

  ionViewWillEnter() {
    this.notificationsService.getNotifications()
    .then((res) => {
      this.notifications = res;
    })
    .catch((err) => {
      console.log(err);
    });
  }

  private dismissNotification(notificationID):void {
    this
    .apiService
    .dismissNotification(notificationID)
    .subscribe((res) => {
      this.notifications = this.notificationsService.dismissNotification(notificationID);
      console.log(res);
    },(err) => {
      console.log(err);
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
      console.log(err);
    });
  }

  private confirmFriendRequest(id_user:string):void {
    this
    .apiService
    .confirmFriendRequest(id_user)
    .subscribe((res) => {
      console.log(res);
    },(err) => {
      console.log(err);
    });
  }
}