import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { FriendsService } from './friends.service';
import { ToastController } from 'ionic-angular';
import * as io from 'socket.io-client';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import { BackgroundMode } from 'ionic-native';
import { APIService } from '../services/api.service';

@Injectable()
export class SocketService {
  private SOCKET_URL:string = Config.getConfig('API_URL');
  private shouldLoadOperations:boolean = false;
  private socket;
  private subscribeToEvents:boolean = true;
  private tempOperations;

  public getSocket() {
    return this.socket;
  }

  constructor(
    private events:Events,
    private friendsService:FriendsService,
    private toastController:ToastController,
    private apiService:APIService
  ) {
    this.events.subscribe('user:logout',() => {
      this.subscribeToEvents = true;
      this.socket.disconnect();
      this.events.unsubscribe('message:send-ready');
      this.socket = null;
    });
  }

  public isConnected():boolean {
    return this.socket.connected
  }

  public async setNewToken(token:string) {
    if ( this.socket ) {
      this.socket.io.opts.query = `auth_token=${token}`;
    }
  }

  public setTempOperations(operations) {
    this.tempOperations = operations.filter(x => {
      return x.name === 'message:new-message';
    });
  }

  public tempOperationsSet():boolean {
    return !!this.tempOperations;
  }

  public getTempOperations() {
    return this.tempOperations;
  }

  public removeTempOperations() {
    this.tempOperations = null;
  }

  public async executeTempOperations() {
    if ( !this.tempOperations ) return;

    await this.executeSocketOperations();
    this.tempOperations = null;
  }
  
  public async executeSocketOperations(forcedOperations?) {
    try {
      let operations;

      if ( !forcedOperations ) {
        if ( !this.shouldLoadOperations && !this.tempOperations ) return;

        if ( this.tempOperations ) {
          operations = this.tempOperations;
        } else {
          if ( !this.shouldLoadOperations ) return;

          const response = await this.apiService.getSocketOperations();
          operations = response.operations;
        }
      } else {
        operations = forcedOperations;
      }

      if ( operations.length > 0 ) {
        for ( let { name,data } of operations ) {
          const parsedData = JSON.parse(data);

          if ( name === 'friends:user-confirmed' ) {
            this.friendsService.addFriend(parsedData);
            this.friendsService.removePendingRequest(parsedData);
          }

          if ( name === 'friends:friend-you-removed' ) {
            this.friendsService.removeFriend(parsedData.IdUserRemoving);
            this.events.publish('friend_you_removed',parsedData);
            continue;
          }

          this.events.publish(name,parsedData);

          if ( name === 'friend:login' ) {
            this.friendsService.userLogIn(parsedData);
          }

          if ( name === 'friend:logout' ) {
            this.friendsService.userLogOut(parsedData);
          }
        }

        // whoever forces operations, needs to delete them!
        if ( !forcedOperations ) {
          await this.apiService.deleteOperations({ });
        }
      }

      this.shouldLoadOperations = false;
    } catch(e) {
      throw e;
    }
  }

  public getConnection() {
    return new Promise(async(resolve,reject) => {
      if ( this.socket && this.socket.connected ) {
        return resolve(this.socket);
      }

      if ( !this.socket ) {
        const token = await SecureDataStorage.Instance().get('token');

        this.socket = io.connect(this.SOCKET_URL,{
          query:`auth_token=${token}`,
          reconnectionDelay: 1000,
          reconnectionDelayMax : 5000,
          reconnectionAttempts: Infinity,
          pingTimeout:4000,
          pingInterval:16000
        });
      }

      this.socket.on('error', async(err) => {
        if ( err.toLowerCase().includes('token expired') ) {
          const token = await SecureDataStorage.Instance().get('token');

          this.socket.disconnect();
          this.socket.io.opts.query = `auth_token=${token}`;
          this.socket.connect();
        } else {
          reject(err);
        }
      });

      this.socket.on('success',() => {
        resolve(this.socket);
      });

      this.socket.on('connect',async() => {
        if ( this.subscribeToEvents ) {
          this.socket.on('notification:new-notification',(notification,ack) => {
            this.events.publish('notification:new-notification',notification);

            ack({ success:true });
          });
  
          this.socket.on('message:new-message',(message,ack) => {
            this.events.publish('message:new-message',message);
            
            if ( !BackgroundMode.isActive() ) {
              const toast = this.toastController.create({
                duration:3000,
                position:'top',
                message:`${message.senderUsername}: ${message.message}`
              });
        
              toast.present();
            }

            ack({ success:true });
          });
          
          this.socket.on('friend:login',(data,ack) => {
            this.events.publish('friend:login',data);
            this.friendsService.userLogIn(data);
            ack({ success:true });
          });
  
          this.socket.on('friend:logout',(data,ack) => {
            this.events.publish('friend:logout',data);
            this.friendsService.userLogOut(data);
            ack({ success:true });
          });  
  
          this.socket.on('message:user-not-online',() => {
            this.events.publish('message:user-not-online');
          });

          this.socket.on('message:not-in-friends-list',() => {
            this.events.publish('message:not-in-friends-list');
          });
  
          this.socket.on('friends:user-confirmed',(friend,ack) => {
            this.friendsService.addFriend(friend);
            this.friendsService.removePendingRequest(friend);
            this.events.publish('friends:user-confirmed',friend);
            ack({ success:true });
          });
          
          this.socket.on('friends:friend-you-removed',(data,ack) => {
            this.friendsService.removeFriend(data.IdUserRemoving);
            this.events.publish('friend_you_removed',data);
            ack({ success:true });
          });

          this.events.subscribe('message:send-ready',(message) => {
            this.socket.emit('new:message',message);
          });

          this.subscribeToEvents = false;
        }

        resolve(this.socket);
      });

      this.socket.on('disconnect',() => {
        this.shouldLoadOperations = true;
      });
    });
  }
}