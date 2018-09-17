import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';

@Injectable()
export class NotificationsService {
  private notifications = [];
  private areNotificationsLoaded = false;

  constructor(
    private apiService:APIService,
    private events:Events
  ) {
    this.events.subscribe('notification:new-notification',(data) => {
      this.notifications.push(data);
    });

    this.events.subscribe('user:logout',() => {
      this.notifications = [];
      this.areNotificationsLoaded = false;
    });
  }

  public dismissNotification(notificationID:string) {
    const notificationIndex = this.notifications.findIndex(
      ({ id_notification }) => id_notification === notificationID
    );

    if ( notificationIndex !== -1 ) {
      this.notifications.splice(notificationIndex,1);
    }

    return this.notifications;
  }

  public dismissAll() {
    this.notifications = [];
  }

  public getNotifications() {
    return new Promise((resolve,reject) => {
      if ( this.areNotificationsLoaded === true ) {
        return resolve(this.notifications);
      }

      this.apiService.getNotifications() .subscribe((res) => {
        this.notifications = res;
        this.areNotificationsLoaded = true;
        
        resolve(this.notifications);
      },(err) => {
        reject(err);
      });
    });
  }
}