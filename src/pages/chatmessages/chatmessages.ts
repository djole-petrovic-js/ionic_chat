import { Component, ViewChild } from '@angular/core';
import { MessagesService } from '../../services/messages.service';
import { Events,AlertController,Content, ToastController } from 'ionic-angular';

@Component({
  selector: 'page-chatmessages',
  templateUrl: 'chatmessages.html',
})
export class ChatMessages {
  private message = '';
  private messages = [];
  private scrollable = '';
  // alert only once that user is not loggedin
  private loggedInNotified:boolean = false;

  @ViewChild('content') content:Content;

  constructor(
    private messagesService:MessagesService,
    private events:Events,
    private alertController:AlertController,
    private toastController:ToastController
  ) { }

  ionViewWillEnter() {
    this.messages = [];
    this.events.subscribe('message:message-recieved',this.messageReceived.bind(this));
    this.events.subscribe('message:not-in-friends-list',this.notInFriendsList.bind(this));
    this.events.subscribe('message:user-not-online',this.userNotOnline.bind(this));
    this.messages = this.messagesService.getMessages();
    
    setTimeout(() => {
      this.content.scrollToBottom();
    },50);
  }

  ionViewWillLeave() {
    this.events.unsubscribe('message:message-recieved');
    this.events.unsubscribe('message:user-not-online');
    this.events.unsubscribe('message:not-in-friends-list');
  }

  private notInFriendsList() {
    const alert = this.alertController.create({
      title:'Sending failed',
      subTitle:'This user is not in your friends list!',
      buttons:['OK']
    });

    alert.present();
  }

  private userNotOnline() {
    if ( this.loggedInNotified ) return;

    const toast = this.toastController.create({
      message:'This user is not online.',
      position:'top',
      duration:2000
    });

    toast.present();
    this.loggedInNotified = true;
  }

  private messageReceived() {
    // making sure scroll is disabled while pushing new message into the page!
    this.scrollable = 'no-scroll';
    this.messages = this.messagesService.getMessages();
    this.scrollable = '';

    // scroll to bottom when receives message, if already at the bottom!
    let dimensions = this.content.getContentDimensions();
    let scrollTop = this.content.scrollTop;
    let contentHeight = dimensions.contentHeight;
    let scrollHeight = dimensions.scrollHeight;

    if ( (scrollTop + contentHeight + 20) < scrollHeight ) {
      setTimeout(() => {
        this.content.scrollToBottom();
      },50);
    }
  }

  private removeMessage(msg):void {
    this.messagesService.removeLocalMessage(msg);
    this.messages = this.messagesService.getMessages();
  }

  private sendMessage():void {
    if ( this.message !== '' ) {
      this.events.publish('message:send',this.message);
      this.messages = this.messagesService.getMessages();
      this.message = '';

      setTimeout(() => {
        this.content.scrollToBottom();
      },50);
    }
  }
}
