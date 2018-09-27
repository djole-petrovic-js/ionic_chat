import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { AppService } from './app.service';
import { ViewController } from 'ionic-angular';
import { FriendsService } from './friends.service';

@Injectable()
export class MessagesService {
  private allMessages = {};
  private unreadMessages = {};
  private messagesToDelete:number[] = [];
  private currentUserToChatWith:string;
  private initialMessagesAreLoaded:boolean = false;
  private currentUserID;
  private nav:ViewController;
  private tempMessages = [];

  public setTempMessages(operations) {
    this.tempMessages = operations.filter(x => {
      return x.name === 'message:new-message';
    });
  }

  constructor(
    private events:Events,
    private apiService:APIService,
    private appService:AppService,
    private friendsService:FriendsService
  ) {
    this.events.subscribe('start:chatting',this.startChatting.bind(this));
    this.events.subscribe('message:send',this.messageSend.bind(this));
    this.events.subscribe('message:new-message',this.newMessage.bind(this));
    this.events.subscribe('user:logout',this.userLogOut.bind(this));
  }

  private async startChatting({ username,id }) {
    this.currentUserToChatWith = username;
    this.currentUserID = id;

    this._deleteInitialMessages(id);

    delete this.unreadMessages[username];
    this.events.publish('start:chatting-ready');
  }

  public getCurrentChattingUserObj() {
    return this.friendsService.getFriend(this.currentUserID);
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
    this.nav = this.appService.getActivePage();

    if ( !(
      this.nav.component === ChatMessages && 
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
    this.unreadMessages = {};
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

  public async getInitialMessages() {
    try {
      if ( this.initialMessagesAreLoaded ) return this.allMessages;

      let messagesFromOperations = this.tempMessages;

      if ( messagesFromOperations.length > 0 ) {
        messagesFromOperations = messagesFromOperations.map(message => {
          return JSON.parse(message.data);
        });

        this.tempMessages = [];
      } else {
        messagesFromOperations = null;
      }

      let messages = await this.apiService.getInitialMessages();

      if ( messagesFromOperations ) {
        messages = [...messagesFromOperations,...messages];
      }

      this.initialMessagesAreLoaded = true;
      this.allMessages = {};

      if ( messages.length !== 0 ) {
        this._storeInitialMessages(messages);
      }

      this.unreadMessages = JSON.parse(JSON.stringify(this.allMessages));
      return this.allMessages;
    } catch(e) {
      throw e;
    }
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

  private async _deleteInitialMessages(userID:number):Promise<void> {
    if ( this.messagesToDelete.indexOf(userID) !== -1 ) {
      try {
        await this.apiService.deleteInitialMessages(userID);

        const messageIndex = this.messagesToDelete.indexOf(userID);

        if ( messageIndex !== -1 ) {
          this.messagesToDelete.splice(messageIndex,1);
        }
      } catch(e) { 
        // if user has problem with deleting initial messages
        // as soon as he visits this page again with internet connection
        // messages will be deleted,or when he restarts the application.
        // So, it is ok to just do nothing if http exception occures.
      }
    }
  }
}