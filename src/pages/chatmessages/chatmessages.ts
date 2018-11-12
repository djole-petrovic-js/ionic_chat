import { Component, ViewChild } from '@angular/core';
import { MessagesService } from '../../services/messages.service';
import { Events,AlertController,Content, ToastController, Keyboard as IonicKeyboard } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Subscription } from 'rxjs';
import { BackgroundMode } from 'ionic-native';
import { LoadingController } from 'ionic-angular';

@Component({
  selector: 'page-chatmessages',
  templateUrl: 'chatmessages.html',
})
export class ChatMessages {
  private user;
  private message:string = '';
  private messages = [];
  private scrollable = '';
  private newMessages:boolean = false;
  // alert only once that user is not loggedin
  private onKeyboardShowSubscriber:Subscription;
  private onKeyboardHideSubscriber:Subscription;

  @ViewChild( Content ) content: Content;
  @ViewChild('messageField') messageField;

  constructor(
    private keyboardIonic:IonicKeyboard,
    private keyboardNative:Keyboard,
    private messagesService:MessagesService,
    private events:Events,
    private alertController:AlertController,
    private toastController:ToastController,
    private loadingController:LoadingController
  ) { }

  public getDate(message):string {
    try {
      const today:Date = new Date();
      let dateStr:string = message.printTime;

      if ( today.getDay() !== message.day ) {
        const p = message.printDate.split('/');

        dateStr += ` ${[p[1],p[0]].join('/')}`;
      }

      return dateStr;
    } catch(e) {
      return '';
    }
  }

  async ionViewWillEnter() {
    this.messagesService.prepareMessagingState();
    this.user = this.messagesService.getCurrentChattingUserObj();

    let loading;

    try {
      if ( this.messagesService.shouldDisplayLoadingScreen() ) {
        loading = this.loadingController.create({
          spinner:'bubbles',content:'Loading Messages...'
        });

        await loading.present();

        this.messages = await this.messagesService.getMessages();
      } else {
        this.messages = await this.messagesService.getMessages();
      }
    } catch(e) {
      return this.alertController.create({
        title:'Error',
        message:'Error occured while trying to get messages. Please try again.',
        buttons:['OK']
      }).present();
    } finally {
      try { if ( loading ) loading.dismiss(); } catch(e) { }
    }

    setTimeout(() => { this.content.scrollToBottom(0); },50);
    
    this.onKeyboardShowSubscriber = this.keyboardNative.onKeyboardShow().subscribe(() => this.scroll());

    this.onKeyboardHideSubscriber = this.keyboardNative.onKeyboardHide().subscribe(() => {
      if ( this.newMessages ) {
        const toast = this.toastController.create({
          duration:3000,
          position:'top',
          message:`You have new messages.`
        });
  
        toast.present();
        this.newMessages = false;
      }
    });

    this.events.subscribe('message:message-recieved',(msg) => this.messageReceived(msg));
    this.events.subscribe('message:not-in-friends-list',() => this.notInFriendsList());
    this.events.subscribe('message:error',() => this.onError());
  }

  ionViewDidLeave() {
    this.events.unsubscribe('message:message-recieved');
    this.events.unsubscribe('message:not-in-friends-list');
    this.events.unsubscribe('message:error');
    this.onKeyboardShowSubscriber.unsubscribe();
    this.onKeyboardHideSubscriber.unsubscribe();
    this.messagesService.releaseAndSave();
  }

  private scroll() {
    setTimeout(() => { this.content.scrollToBottom(); },50);
  }

  private onError() {
    const alert = this.alertController.create({
      title:'Sending failed',
      subTitle:'Message failed to send!',
      buttons:['OK']
    });

    alert.present();
  }

  private notInFriendsList() {
    const alert = this.alertController.create({
      title:'Sending failed',
      subTitle:'This user is not in your friends list!',
      buttons:['OK']
    });

    alert.present();
  }

  private async messageReceived(message) {
    if ( message.user !== this.user.username ) {
      if ( this.keyboardIonic.isOpen() ) {
        this.newMessages = true;
      } else {
        if ( !BackgroundMode.isActive() ) {
          const toast = this.toastController.create({
            duration:3000,
            position:'top',
            message:`${message.user}: ${message.message}`,
            showCloseButton:true,
            closeButtonText:'OK'
          });
    
          toast.present();
        }
      }

      return;
    }

    if ( this.messagesService.shouldAutoScroll() ) {
      this.scroll();

      return;
    }

    const dimensions = this.content.getContentDimensions();
    // making sure scroll is disabled while pushing new message into the page!
    this.scrollable = 'no-scroll';
    this.scrollable = '';
    // scroll to bottom when receives message, if already at the bottom!
    if ( this.keyboardIonic.isOpen() ) {
      this.scroll();
      this.messageField.setFocus();
    } else {
      if ( (dimensions.scrollTop + dimensions.contentHeight) >= (dimensions.scrollHeight - 100) ) {
        this.scroll();
      } else {
        if ( !BackgroundMode.isActive() ) {
          const toast = this.toastController.create({
            duration:3000,
            position:'top',
            message:`${message.user}: ${message.message}`,
            showCloseButton:true,
            closeButtonText:'OK'
          });
    
          toast.present();
        }
      }
    }
  }

  private sendMessage() {
    if ( this.message !== '' ) {
      if ( this.message.length >= 255 ) {
        const alert = this.alertController.create({
          title:'Sending Error.',
          message:'Message needs to have less than 255 characters',
          buttons:['OK']
        });

        return alert.present();
      }

      this.events.publish('message:send',this.message);
      this.message = '';
      this.scroll();
    }
  }
}