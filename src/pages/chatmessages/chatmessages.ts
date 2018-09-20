import { Component, ViewChild, ElementRef } from '@angular/core';
import { MessagesService } from '../../services/messages.service';
import { Events,AlertController,Content, ToastController, Keyboard as IonicKeyboard } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Subscription } from 'rxjs';

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
  private onKeyboardShowSubscriber:Subscription;

  @ViewChild(Content) content: Content;
  @ViewChild('messageField') messageField:ElementRef;

  constructor(
    private keyboardIonic:IonicKeyboard,
    private keyboardNative:Keyboard,
    private messagesService:MessagesService,
    private events:Events,
    private alertController:AlertController,
    private toastController:ToastController
  ) { }

  ionViewWillEnter() {
    this.onKeyboardShowSubscriber = this.keyboardNative.onKeyboardShow().subscribe(() => this.scroll());

    this.messages = [];
    this.events.subscribe('message:message-recieved',this.messageReceived.bind(this));
    this.events.subscribe('message:not-in-friends-list',this.notInFriendsList.bind(this));
    this.events.subscribe('message:user-not-online',this.userNotOnline.bind(this));
    this.messages = this.messagesService.getMessages();
    
    this.scroll();
  }

  ionViewWillLeave() {
    this.events.unsubscribe('message:message-recieved');
    this.events.unsubscribe('message:user-not-online');
    this.events.unsubscribe('message:not-in-friends-list');
    this.onKeyboardShowSubscriber.unsubscribe();
  }

  private scroll() {
    setTimeout(() => { this.content.scrollToBottom(); },50);
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
    const dimensions = this.content.getContentDimensions();
    // making sure scroll is disabled while pushing new message into the page!
    this.scrollable = 'no-scroll';
    this.messages = this.messagesService.getMessages();
    this.scrollable = '';
    // // scroll to bottom when receives message, if already at the bottom!
    if ( this.keyboardIonic.isOpen() ) {
      this.scroll();
      this.messageField.nativeElement.focus();
    } else {
      if ( (dimensions.scrollTop + dimensions.contentHeight) >= dimensions.scrollHeight ) {
        this.scroll();
      }
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
      this.scroll();
    }
  }
}