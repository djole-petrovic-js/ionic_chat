import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { AppService } from './app.service';
import { FriendsService } from './friends.service';
import { Storage } from '@ionic/storage';

@Injectable()
export class MessagesService {
  private allMessages = {};
  private allMessagesArray = [];
  private unreadMessages = {};
  private messagesToDelete:number[] = [];
  private currentUserToChatWith:string;
  private initialMessagesAreLoaded:boolean = false;
  private currentUserID;
  private tempMessages = [];
  // use this when inserting messages from operations
  // so the view auto scrolls.
  private numberOfSocketMessages = 0;
  private shouldSaveMessages:boolean = false;
  private shouldSaveUnreadMessages:boolean = false;

  public setNumberOfSocketMessages(n:number):void {
    this.numberOfSocketMessages = n;
  }

  public shouldAutoScroll():boolean {
    return this.numberOfSocketMessages > 0;
  }

  constructor(
    private events:Events,
    private apiService:APIService,
    private appService:AppService,
    private friendsService:FriendsService,
    private localStorage:Storage
  ) {
    this.events.subscribe('start:chatting',(data) => this.startChatting(data));
    this.events.subscribe('message:send',(data) => this.messageSend(data));
    this.events.subscribe('message:new-message',(data) => this.newMessage(data));
    this.events.subscribe('user:logout',() => this.userLogOut());
  }

  private async startChatting({ username,id }) {
    this.currentUserToChatWith = username;
    this.currentUserID = id;
    this._deleteInitialMessages(id);

    if ( this.unreadMessages[username] ) {
      this.shouldSaveUnreadMessages = true;
      delete this.unreadMessages[username];
    }

    this.events.publish('start:chatting-ready');
  }

  public getCurrentChattingUserObj() {
    return this.friendsService.getFriend(this.currentUserID);
  }

  private async messageSend(message) {
    if ( this.allMessages[this.currentUserToChatWith] ) {
      this.allMessages[this.currentUserToChatWith].push({
        user:null , message
      });
    } else {
      this.allMessages[this.currentUserToChatWith] = [{ user:null,message }];
    }

    this.allMessagesArray.push({
      senderUsername:this.currentUserToChatWith,
      // user using this device has sent this message
      // not user he is currently chatting.
      // Important for displaying messages when app loads
      deviceUserSentMessage:true,
      message
    });

    this.shouldSaveMessages = true;

    this.events.publish('message:send-ready',{
      userID:this.currentUserID,
      message:message
    });
  }

  private async newMessage(data) {
    const messageToStore = { user:data.senderUsername , message:data.message };
    // If the page is ChatMessages and current user to chat with is
    // user sending the message, dont store it as unread message
    if ( !(
      this.appService.getActivePage().component === ChatMessages && 
      data.senderUsername === this.currentUserToChatWith
    ) ) {
      this.shouldSaveUnreadMessages = true;
      // now we store the message as unread
      if ( !this.unreadMessages[data.senderUsername] ) {
        this.unreadMessages[data.senderUsername] = [];
      }

      this.unreadMessages[data.senderUsername].push(messageToStore);
    }

    if ( this.allMessages[data.senderUsername] ) {
      this.allMessages[data.senderUsername].push(messageToStore);
    } else {
      this.allMessages[data.senderUsername] = [messageToStore];
    }

    this.allMessagesArray.push(data);
    this.shouldSaveMessages = true;

    this.events.publish('message:message-recieved',{
      user:data.senderUsername,
      message:data.message
    });

    if ( this.numberOfSocketMessages !== 0 ) {
      this.numberOfSocketMessages--;
    }
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

      let [ messages,unreadFromStorage,messagesFromStorage ] = await Promise.all([
        this.apiService.getInitialMessages(),
        this.localStorage.get('unreadMessages'),
        this.localStorage.get('messages')
      ]);

      if ( messagesFromOperations ) {
        messages = [...messagesFromOperations,...messages];
      }

      unreadFromStorage = unreadFromStorage || {};

      this.unreadMessages = messages.reduce((unread,item) => {
        if ( !unread[item.senderUsername] ) {
          unread[item.senderUsername] = [];
        }

        unread[item.senderUsername].push({ message:item.message,user:item.senderUsername });
 
        return unread;
      },unreadFromStorage);
      // unstable shutdowns could happend, so store every message in storage
      // and delete only if user logs out, or he explicitly exits the app.
      if ( messagesFromStorage ) {
        messages = [...messagesFromStorage,...messages];
      }

      this.initialMessagesAreLoaded = true;
      this.allMessages = {};
      this.allMessagesArray = messages;

      await this.localStorage.set('messages',messages);

      if ( messages.length !== 0 ) {
        this._storeInitialMessages(messages);
      }

      return this.allMessages;
    } catch(e) {
      throw e;
    }
  }

  public getMessages() {
    if ( !this.allMessages[this.currentUserToChatWith] ) {
      this.allMessages[this.currentUserToChatWith] = [];
    }

    return this.allMessages[this.currentUserToChatWith];
  }

  public getUnreadMessages() {
    return this.unreadMessages;
  }

  public setTempMessages(operations):void {
    this.tempMessages = operations.filter(x => x.name === 'message:new-message');
  }

  public refreshInitialMessages():void {
    this.initialMessagesAreLoaded = false;
    this.getMessages();
  }

  public async saveMessages():Promise<boolean> {
    try {
      if ( this.shouldSaveMessages ) {
        await this.localStorage.set('messages',this.allMessagesArray);
        this.shouldSaveMessages = false;
      }

      if ( this.shouldSaveUnreadMessages ) {
        await this.localStorage.set('unreadMessages',this.unreadMessages);
        this.shouldSaveUnreadMessages = false;
      }

      return true;
    } catch(e) {
      return false;
    }
  }

  public async removeAllMessages():Promise<void> {
    try {
      await Promise.all([
        this.localStorage.remove('messages'),
        this.localStorage.remove('unreadMessages')
      ]);
    } catch(e) { }
  }

  private async userLogOut() {
    this.allMessages = {};
    this.unreadMessages = {};
    this.refreshInitialMessages();
    await this.removeAllMessages();
  }

  private _storeInitialMessages(messages):void {
    for ( const { message,senderUsername,senderID,deviceUserSentMessage } of messages ) {
      const msg = { message,user:senderUsername };

      if ( !this.allMessages[senderUsername] ) {
        this.allMessages[senderUsername] = [];
      }

      if ( deviceUserSentMessage ) {
        this.allMessages[senderUsername].push({
          message,
          user:null
        });
      } else {
        this.allMessages[senderUsername].push(msg);
      }

      if ( senderID && this.messagesToDelete.indexOf(senderID) === -1 ) {
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