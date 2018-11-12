import { Injectable } from '@angular/core';
import { FriendsService } from './friends.service';
import { Events, ViewController } from 'ionic-angular';
import { ToastController } from 'ionic-angular';
import * as io from 'socket.io-client';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import { BackgroundMode } from 'ionic-native';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { AppService } from './app.service';
import { MessagesService } from './messages.service';
import { AlertController } from 'ionic-angular';
import { LockScreenComponent } from 'ionic-simple-lockscreen';

@Injectable()
export class SocketService {
  private SOCKET_URL:string = Config.getConfig('API_URL');
  private socket;
  private subscribeToEvents:boolean = true;
  private failedReconnectionAttempts:number = 0;
  private shouldPublicReconnectFailure:boolean = true;

  constructor(
    private events:Events,
    private friendsService:FriendsService,
    private toastController:ToastController,
    private alertController:AlertController,
    private appService:AppService,
    private messagesService:MessagesService
  ) {
    this.events.subscribe('user:logout',() => {
      this.subscribeToEvents = true;

      if ( this.socket ) {
        this.socket.disconnect();
      }

      this.events.unsubscribe('message:send-ready');
      this.socket = null;
    });
  }

  public getSocket() {
    return this.socket;
  }

  private wait():Promise<void> {
    return new Promise((resolve) => setTimeout(resolve,3000));
  }

  public async executeSocketOperations(operations) {
    try {
      if ( operations.length > 0 ) {
        let numberOfMessages:number = operations.reduce((total,item) => {
          if ( item.name === 'message:new-message') {
            total++;
          }

          return total;
        },0);

        this.messagesService.setNumberOfSocketMessages(numberOfMessages);

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
      }
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
        const token = await SecureDataStorage.Instance().get('socketIoToken');
        const uuid = Config.getDeviceInfo().uuid;

        this.socket = io.connect(this.SOCKET_URL,{
          query:`id=${uuid}&auth_token=${token}`,
          reconnectionDelay:1000,
          reconnectionDelayMax:5000,
          reconnectionAttempts:Infinity,
          pingTimeout:4000,
          pingInterval:16000
        });
      }

      if ( this.subscribeToEvents ) {
        this.socket.on('error', async(err) => {
          if ( typeof err === 'string' && err.toLowerCase().includes('token expired') ) {
            if ( !this.shouldPublicReconnectFailure ) return;

            if ( this.failedReconnectionAttempts > 3 ) {
              this.alertController.create({
                title:'Connection Error',
                message:'Could not establish connection. Try to restart application.'
              }).present();

              this.socket.disconnect();
              this.shouldPublicReconnectFailure = false;

              return;
            }

            this.failedReconnectionAttempts++;
            await this.wait();

            const token = await SecureDataStorage.Instance().get('socketIoToken');
            const uuid = Config.getDeviceInfo().uuid;
  
            this.socket.disconnect();
            this.socket.io.opts.query = `id=${uuid}&auth_token=${token}`;
            this.socket.connect();
          } else {
            reject(err);
          }
        });
  
        this.socket.on('success',() => {
          resolve(this.socket);
        });
      }

      this.socket.on('connect',async() => {
        if ( this.subscribeToEvents ) {
          this.socket.on('notification:new-notification',(notification,ack) => {
            this.events.publish('notification:new-notification',notification);

            ack({ success:true });
          });

          this.socket.on('new_token',async(data) => {
            await SecureDataStorage.Instance().set('socketIoToken',data.token);
          });
  
          this.socket.on('message:new-message',(message,ack) => {
            this.events.publish('message:new-message',message);

            if ( !BackgroundMode.isActive() ) {
              const activePage:ViewController = this.appService.getActivePage();

              if (
                activePage.component !== ChatMessages &&
                activePage.component !== LockScreenComponent
              ) {
                const toast = this.toastController.create({
                  duration:3000,
                  position:'top',
                  message:`${message.senderUsername}: ${message.message}`,
                  showCloseButton:true,
                  closeButtonText:'OK'
                });
          
                toast.present();
              }
            }

            ack({ success:true });
          });

          this.socket.on('operations:new_operations',(data) => {
            this.executeSocketOperations(data.operations);
          });

          this.socket.on('message:error',() => {
            this.events.publish('message:error');
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

          this.socket.on('disconnect',() => { });

          this.subscribeToEvents = false;
        }

        resolve(this.socket);
      });
    });
  }
}