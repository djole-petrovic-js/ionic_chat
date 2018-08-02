import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';

@Injectable()
export class MessagesService {
  private allMessages = {};
  private messagesToDelete:number[] = [];
  private currentUserToChatWith:string;
  private initialMessagesAreLoaded:boolean = false;
  private currentUserID;

  constructor(
    private events:Events,
    private apiService:APIService
  ) {
    this.events.subscribe('start:chatting',({ username,id }) => {
      this.currentUserToChatWith = username;
      this.currentUserID = id;

      this.events.publish('start:chatting-ready');
      this._deleteInitialMessages(id);
    });

    this.events.subscribe('message:send',(message) => {
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
    });

    this.events.subscribe('message:new-message',(data) => {
      if ( this.allMessages[data.senderUsername] ) {
        this.allMessages[data.senderUsername].push({
          user:data.senderUsername , message:data.message
        });
      } else {
        this.allMessages[data.senderUsername] = [{user:null,message:data.message}];
      }

      this.events.publish('message:message-recieved',{
        user:data.senderUsername,
        message:data.message
      });
    });

    this.events.subscribe('user:logout',() => {
      this.allMessages = {};
      this.refreshInitialMessages();
    });
  }

  public getMessages() {
    if ( !this.allMessages[this.currentUserToChatWith] ) {
      this.allMessages[this.currentUserToChatWith] = [];
    }

    return this.allMessages[this.currentUserToChatWith];
  }

  public getInitialMessages():void {
    if ( !this.initialMessagesAreLoaded ) {
      this.apiService
      .getInitialMessages()
      .subscribe((messages) => {
        this.initialMessagesAreLoaded = true;

        if ( messages.length !== 0 ) {
          this._storeInitialMessages(messages);
        }
      },(err) => {
        console.log(err);
      });
    }
  }

  public refreshInitialMessages():void {
    this.initialMessagesAreLoaded = false;
    this.getMessages();
  }

  private _storeInitialMessages(messages):void {
    for ( const { message,senderUsername,senderID } of messages ) {
      const msg = {
        message,user:senderUsername
      };

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
      .subscribe((response) => {
        const index:number = this.messagesToDelete.indexOf(userID);

        this.messagesToDelete.splice(index,1);
      },(err) => {
        console.log(err);
      });
    }
  }
}