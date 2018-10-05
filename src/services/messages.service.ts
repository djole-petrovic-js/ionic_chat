import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { AppService } from './app.service';
import { ViewController } from 'ionic-angular';
import { FriendsService } from './friends.service';
import { SecureDataStorage } from '../Libs/SecureDataStorage';

@Injectable()
export class MessagesService {
  private allMessages = {};
  private allMessagesArray = [];
  private unreadMessages = {};
  private messagesToDelete:number[] = [];
  private currentUserToChatWith:string;
  private initialMessagesAreLoaded:boolean = false;
  private currentUserID;
  private nav:ViewController;
  private tempMessages = [];

  private numberOfSocketMessages = 0;

  public setNumberOfSocketMessages(n:number):void {
    this.numberOfSocketMessages = n;
  }

  public shouldAutoScroll():boolean {
    if ( this.numberOfSocketMessages > 0 ) {
      return true;
    } else {
      return false;
    }
  }

  constructor(
    private events:Events,
    private apiService:APIService,
    private appService:AppService,
    private friendsService:FriendsService,
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

    delete this.unreadMessages[username];
    SecureDataStorage.Instance().set('unreadMessages',this.unreadMessages);
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

    await SecureDataStorage.Instance().set('messages',this.allMessagesArray);

    this.events.publish('message:send-ready',{
      userID:this.currentUserID,
      message:message
    });
  }

  private async newMessage(data) {
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
      await SecureDataStorage.Instance().set('unreadMessages',this.unreadMessages);
    }

    if ( this.allMessages[data.senderUsername] ) {
      this.allMessages[data.senderUsername].push(messageToStore);
    } else {
      this.allMessages[data.senderUsername] = [messageToStore];
    }

    this.allMessagesArray.push(data);
    await SecureDataStorage.Instance().set('messages',this.allMessagesArray);

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

      let messages = await this.apiService.getInitialMessages();

      if ( messagesFromOperations ) {
        messages = [...messagesFromOperations,...messages];
      }
      // messages stored from operations and offline mode should
      // be added as unread messages, not the ones from storage
      let unreadFromStorage = await SecureDataStorage.Instance().get('unreadMessages');

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
      const messagesFromStorage = await SecureDataStorage.Instance().get('messages');

      if ( messagesFromStorage ) {
        messages = [...messagesFromStorage,...messages];
      }

      this.initialMessagesAreLoaded = true;
      this.allMessages = {};
      this.allMessagesArray = messages;

      await SecureDataStorage.Instance().set('messages',messages);
      
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

  public setTempMessages(operations) {
    this.tempMessages = operations.filter(x => x.name === 'message:new-message');
  }

  public refreshInitialMessages():void {
    this.initialMessagesAreLoaded = false;
    this.getMessages();
  }

  public async removeAllMessages():Promise<void> {
    try {
      await Promise.all([
        SecureDataStorage.Instance().remove('messages'),
        SecureDataStorage.Instance().remove('unreadMessages')
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