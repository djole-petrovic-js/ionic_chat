import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { FriendsService } from './friends.service';
import { ToastController } from 'ionic-angular';
import * as io from 'socket.io-client';
import { Config } from '../Libs/Config';

@Injectable()
export class SocketService {
  private SOCKET_URL:string = Config.getConfig('API_URL');
  private connectionEstablished:boolean = false;
  private socket;

  public getSocket() {
    return this.socket;
  }

  constructor(
    private apiService:APIService,
    private events:Events,
    private friendsService:FriendsService,
    private toastController:ToastController
  ) {
    this.events.subscribe('user:logout',() => {
      this.connectionEstablished = false;
      this.socket.disconnect();
    });
  }

  public getConnection() {
    return new Promise((resolve,reject) => {
      if ( this.connectionEstablished === true ) {
        return resolve(this.socket);
      }

      this.apiService.getToken().then((token) => {
        this.socket = io.connect(this.SOCKET_URL,{
          query: 'token=' + token,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax : 5000,
          reconnectionAttempts: Infinity,
          forceNew:true
        });

        this.connectionEstablished = true;

        this.socket.on('connect',() => {
          
          this.socket.on('notification:new-notification',(notification) => {
            this.events.publish('notification:new-notification',notification);
          });
  
          this.socket.on('message:new-message',(message) => {
            this.events.publish('message:new-message',message);
  
            const toast = this.toastController.create({
              duration:3000,
              position:'top',
              message:`${message.senderUsername}: ${message.message}`
            });
      
            toast.present();
          });
  
          this.socket.on('friend:login',(data) => {
            this.events.publish('friend:login',data);
            this.friendsService.userLogIn(data);
          });
  
          this.socket.on('friend:logout',(data) => {
            this.events.publish('friend:logout',data);
            this.friendsService.userLogOut(data);
          });  
  
          this.socket.on('message:user-not-online',() => {
            this.events.publish('message:user-not-online');
          });

          this.socket.on('message:not-in-friends-list',() => {
            this.events.publish('message:not-in-friends-list');
          });
  
          this.socket.on('friends:user-confirmed',(friend) => {
            this.events.publish('friends:user-confirmed',friend);
            this.friendsService.addFriend(friend);
          });
          
          this.socket.on('friend:friend-you-removed',(data) => {
            this.events.publish('friend:friend-you-removed',data);
            this.friendsService.forceNewLoad();
          });

          this.events.subscribe('message:send-ready',(message) => {
            this.socket.emit('new:message',message);
          });

          resolve(this.socket);
        });

        this.socket.on('disconnect',() => {
          this.socket.removeListener('notification:new-notification');
          this.socket.removeListener('message:new-message');
          this.socket.removeListener('friend:login');
          this.socket.removeListener('friend:logout');
          this.socket.removeListener('message:user-not-online');
          this.socket.removeListener('message:not-in-friends-list');
          this.socket.removeListener('friends:user-confirmed');
          this.socket.removeListener('friend:friend-you-removed');
          this.events.unsubscribe('message:send-ready');
        });

      }).catch((err) => {
        reject(err);
      });
    });
  }
}