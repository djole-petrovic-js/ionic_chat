import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { FriendsService } from './friends.service';
import { Storage } from '@ionic/storage';
import { AppService } from './app.service';
import { ChatMessages } from '../pages/chatmessages/chatmessages';

@Injectable()
export class MessagesService {
  private unreadMessages = {};
  private messages:any[] = [];
  private messagesForNonCurrentUser = {};
  private currentUserToChatWith:string;
  private currentUserID:number;
  private lastCurrentUserToChatWith:string;
  private lastCurrentUserID:number;
  private loadedMessagesIDs:number[] = [];
  private storageMessagesForRemoving:number[] = [];
  // use this when inserting messages from operations
  // so the view auto scrolls.
  private numberOfSocketMessages = 0;
  private shouldDisplayLoading:boolean = false;
  private shouldDeleteStorageMessages:boolean = true;

  public shouldDisplayLoadingScreen():boolean {
    return this.shouldDisplayLoading;
  }

  public setNumberOfSocketMessages(n:number):void {
    this.numberOfSocketMessages = n;
  }

  public shouldAutoScroll():boolean {
    return this.numberOfSocketMessages > 0;
  }

  constructor(
    private events:Events,
    private apiService:APIService,
    private friendsService:FriendsService,
    private storage:Storage,
    private appService:AppService
  ) {
    this.events.subscribe('start:chatting',(data) => this.startChatting(data));
    this.events.subscribe('message:send',(data) => this.messageSend(data));
    this.events.subscribe('message:new-message',(data) => this.newMessage(data));
    this.events.subscribe('user:logout',() => this.userLogOut());
  }

  private async startChatting({ username,id }) {
    if ( this.shouldDeleteStorageMessages ) {
      const messagesFromStorageToDelete = await this.storage.get('messages:remove');

      if ( messagesFromStorageToDelete && messagesFromStorageToDelete.length > 0 ) {
        await Promise.all(messagesFromStorageToDelete.map(id => this.storage.remove('messages:' + id)));
      }

      this.shouldDeleteStorageMessages = false;
    }

    if ( this.currentUserID !== id ) {
      this.currentUserToChatWith = username;
      this.currentUserID = id;
      this.shouldDisplayLoading = this.loadedMessagesIDs.indexOf(id) === -1;
      this.messages = null;
    }

    if ( this.storageMessagesForRemoving.indexOf(this.currentUserID) === -1 ) {
      this.storageMessagesForRemoving.push(this.currentUserID);
      await this.storage.set('messages:remove',this.storageMessagesForRemoving);
    }

    this.lastCurrentUserID = null;
    this.lastCurrentUserToChatWith = null;
    delete this.unreadMessages[id];
    this.events.publish('start:chatting-ready');
  }

  public prepareMessagingState():void {
    if ( this.lastCurrentUserID && this.lastCurrentUserToChatWith ) {
      this.currentUserID = this.lastCurrentUserID;
      this.currentUserToChatWith = this.lastCurrentUserToChatWith;
      delete this.unreadMessages[this.currentUserID];
    }
  }

  public getCurrentChattingUserObj() {
    return this.friendsService.getFriend(this.currentUserID);
  }

  public getUnreadMessages() {
    return this.unreadMessages;
  }

  public async releaseAndSave() {
    if ( this.messages ) {
      await this.storage.set('messages:' + this.currentUserID,this.messages);
    }

    this.lastCurrentUserID = this.currentUserID;
    this.lastCurrentUserToChatWith = this.currentUserToChatWith;
    this.currentUserToChatWith = null;
    this.currentUserID = null;
    this.messages = null;
  }

  private async messageSend(message) {
    const d:Date = new Date();

    this.messages.push({
      user:null,
      id_sending:null,
      message,
      printDate:d.toLocaleDateString(),
      printTime:d.toLocaleTimeString([],{
        hour:'2-digit',
        minute:'2-digit',
        hour12:false
      }),
      day:d.getDay(),
    });

    this.events.publish('message:send-ready',{
      userID:this.currentUserID,
      message:message
    });
  }

  private async newMessage(data) {
    const d:Date = new Date(data.date);

    const message = {
      user:data.senderUsername,
      message:data.message,
      id_sending:data.id_sending,
      printDate:d.toLocaleDateString(),
      printTime:d.toLocaleTimeString([],{
        hour:'2-digit',
        minute:'2-digit',
        hour12:false
      }),
      day:d.getDay()
    };

    if ( !(
      this.appService.getActivePage().component === ChatMessages && 
      data.senderUsername === this.currentUserToChatWith
    ) ) {
      if ( this.unreadMessages[data.id_sending] ) {
        this.unreadMessages[data.id_sending]++;
      } else {
        this.unreadMessages[data.id_sending] = 1;
      }
    }

    if ( data.senderUsername === this.currentUserToChatWith ) {
      this.messages.push(message);
    } else {
      if ( this.loadedMessagesIDs.indexOf(data.id_sending) !== -1 ) {
        if ( !this.messagesForNonCurrentUser[data.id_sending] ) {
          this.messagesForNonCurrentUser[data.id_sending] = [];
        }
  
        this.messagesForNonCurrentUser[data.id_sending].push(message);
      }
    }

    this.events.publish('message:message-recieved',message);

    if ( this.numberOfSocketMessages !== 0 ) {
      this.numberOfSocketMessages--;
    }
  }

  public async getMessages() {
    if ( this.messages ) return this.messages;

    if ( this.loadedMessagesIDs.indexOf(this.currentUserID) !== -1 ) {
      const messages = await this.storage.get('messages:' + this.currentUserID);

      if ( messages ) {
        this.messages = messages;
  
        if ( this.messagesForNonCurrentUser[this.currentUserID] ) {
          this.messages.push(...this.messagesForNonCurrentUser[this.currentUserID]);
          delete this.messagesForNonCurrentUser[this.currentUserID];
        }
      } else {
        this.messages = [];
      }

      return this.messages;
    }

    let messages = await this.apiService.getMessages({ id:this.currentUserID });

    messages = messages.map(msg => {
      const d = new Date(msg.date);

      msg.printDate = d.toLocaleDateString();

      msg.printTime = d.toLocaleTimeString([],{
        hour: '2-digit',
        minute:'2-digit',
        hour12:false
      });

      msg.day = d.getDay();

      return msg;
    });

    this.messages = messages;
    this.shouldDisplayLoading = false;
    this.loadedMessagesIDs.push(this.currentUserID);

    return this.messages;
  }

  public async deleteMessages():Promise<boolean> {
    try {
      await this.apiService.deleteMessages();

      await Promise.all([
        this.storage.remove('messages:remove'),
        ...this.storageMessagesForRemoving.map(
          id => this.storage.remove('messages:' + id)
        )
      ]);

      return true;
    } catch(e) {
      return false;
    }
  }

  public async userLogOut() {
    this.loadedMessagesIDs = [];
    this.currentUserToChatWith = null;
    this.currentUserID = null;
    this.lastCurrentUserID = null;
    this.lastCurrentUserToChatWith = null;
    this.messages = null;
    this.deleteMessages();
    this.unreadMessages = {};
    this.messagesForNonCurrentUser = {};
  }
}