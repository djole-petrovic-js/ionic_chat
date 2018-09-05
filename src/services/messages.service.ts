import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { NavController, App } from "ionic-angular/index";

@Injectable()
export class MessagesService {
  private allMessages = {};
  private unreadMessages = {};
  private messagesToDelete:number[] = [];
  private currentUserToChatWith:string;
  private initialMessagesAreLoaded:boolean = false;
  private currentUserID;

  private nav:NavController;
  private app:App;

  constructor(
    private events:Events,
    private apiService:APIService,
    private application:App
  ) {
    this.app = application;
    
    this.events.subscribe('start:chatting',this.startChatting.bind(this));
    this.events.subscribe('message:send',this.messageSend.bind(this));
    this.events.subscribe('message:new-message',this.newMessage.bind(this));
    this.events.subscribe('user:logout',this.userLogOut.bind(this));
  }

  private startChatting({ username,id }) {
    this.currentUserToChatWith = username;
    this.currentUserID = id;

    this.events.publish('start:chatting-ready');
    this._deleteInitialMessages(id);
    
    delete this.unreadMessages[username];
  }

  private messageSend(message) {
    if ( this.allMessages[this.currentUserToChatWith] ) {
      this.allMessages[this.currentUserToChatWith].push({
        user:null , message
      });
    } else {
      this.allMessages[this.currentUserToChatWith] = [{user:null,message}];
    }

    this.events.publish('message:send-ready',{
      userID:this.currentUserID,
      message:message
    });
  }

  private newMessage(data) {
    const messageToStore = { user:data.senderUsername , message:data.message };
    // If the page is ChatMessages and current user to chat with is
    // user sending the message, dont store it as unread message
    this.nav = this.application.getActiveNav();

    if ( !(
      this.nav.getActive().name === 'ChatMessages' && 
      data.senderUsername === this.currentUserToChatWith
    ) ) {
      // now we store the message as unread
      if ( !this.unreadMessages[data.senderUsername] ) {
        this.unreadMessages[data.senderUsername] = [];
      }

      this.unreadMessages[data.senderUsername].push(messageToStore);
      this.events.publish('message:stored-unread-message');
    }

    if ( this.allMessages[data.senderUsername] ) {
      this.allMessages[data.senderUsername].push(messageToStore);
    } else {
      this.allMessages[data.senderUsername] = [messageToStore];
    }

    this.events.publish('message:message-recieved',{
      user:data.senderUsername,
      message:data.message
    });
  }

  private async userLogOut() {
    this.allMessages = {};
    await this.refreshInitialMessages();
  }

  public getMessages() {
    if ( !this.allMessages[this.currentUserToChatWith] ) {
      this.allMessages[this.currentUserToChatWith] = [];
    }

    return this.allMessages[this.currentUserToChatWith];
  }

  public removeLocalMessage(msg) {
    const msgIndex = this.allMessages[this.currentUserToChatWith].findIndex(x => {
      return x.user === msg.user && x.message === msg.message;
    });

    if ( msgIndex !== -1 ) {
      this.allMessages[this.currentUserToChatWith].splice(msgIndex,1);
    }
  }

  public getUnreadMessages() {
    return this.unreadMessages;
  }

  public getInitialMessages() {
    return new Promise((resolve,reject) => {
      if ( !this.initialMessagesAreLoaded ) {
        this.apiService
          .getInitialMessages()
          .subscribe((messages) => {
            this.initialMessagesAreLoaded = true;
            this.allMessages = {};

            if ( messages.length !== 0 ) {
              this._storeInitialMessages(messages);
            }

            // maybe find another way to Deep Clone?
            this.unreadMessages = JSON.parse(JSON.stringify(this.allMessages));
            resolve(this.allMessages);
          },(err) => {
            reject(err);
          });
      } else {
        resolve(this.allMessages);
      }
    });
  }

  public refreshInitialMessages():void {
    this.initialMessagesAreLoaded = false;
    this.getMessages();
  }

  private _storeInitialMessages(messages):void {
    for ( const { message,senderUsername,senderID } of messages ) {
      const msg = { message,user:senderUsername };

      if ( this.allMessages[senderUsername] ) {
        this.allMessages[senderUsername].push(msg);
      } else {
        this.allMessages[senderUsername] = [msg]
      }

      if ( this.messagesToDelete.indexOf(senderID) === -1 ) {
        this.messagesToDelete.push(senderID);
      }
    }
  }

  private _deleteInitialMessages(userID:number):void {
    if ( this.messagesToDelete.indexOf(userID) !== -1 ) {
      this.apiService.deleteInitialMessages(userID)
        .subscribe(() => {
          this.messagesToDelete.splice(this.messagesToDelete.indexOf(userID),1);
        },(err) => {
          // ne radi preko error resolvera...
          console.log(err);
        });
    }
  }
}