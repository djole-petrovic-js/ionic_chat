import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { FriendsService } from './friends.service';
import * as io from 'socket.io-client';

@Injectable()
export class SocketService {
  private SOCKET_URL:string = 'http://localhost:3000';
  private connectionEstablished:boolean = false;
  private socket;

  constructor(
    private apiService:APIService,
    private events:Events,
    private friendsService:FriendsService
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
        });

        this.connectionEstablished = true;

        this.socket.on('notification:new-notification',(notification) => {
          this.events.publish('notification:new-notification',notification);
        });

        this.socket.on('message:new-message',(message) => {
          console.log(message)
          this.events.publish('message:new-message',message);
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

        this.socket.on('friends:user-confirmed',(friend) => {
          this.events.publish('friends:user-confirmed',friend);
          this.friendsService.addFriend(friend);
        });

        this.events.subscribe('message:send-ready',(message) => {
          this.socket.emit('new:message',message);
        });

        this.socket.on('disconnect',() => {
          this.socket.removeListener('notification:new-notification');
          this.socket.removeListener('message:new-message');
          this.socket.removeListener('friend:login');
          this.socket.removeListener('friend:logout');
          this.socket.removeListener('message:user-not-online');
          this.socket.removeListener('friends:user-confirmed');
          this.events.unsubscribe('message:send-ready');
        });

        resolve(this.socket);
      }).catch((err) => {
        console.log(err);
      });
    });
  }
}