import { Component } from '@angular/core';
import { MessagesService } from '../../services/messages.service';
import { Events } from 'ionic-angular';

@Component({
  selector: 'page-chatmessages',
  templateUrl: 'chatmessages.html'
})
export class ChatMessages {
  private message = '';
  private messages = [];

  constructor(
    private messagesService:MessagesService,
    private events:Events,
  ) {
    
  }

  ionViewWillEnter() {
    this.messages = [];

    this.events.subscribe('message:message-recieved',(data) => {
      this.messages = this.messagesService.getMessages();
    });

    this.events.subscribe('message:user-not-online',() => {
      console.log('user has logged out...');
    });

    this.messages = this.messagesService.getMessages();
  }

  ionViewWillLeave() {
    this.events.unsubscribe('message:message-recieved');
    this.events.unsubscribe('message:user-not-online');
  }

  //treba valjda da se sredi...
  private sendMessage():void {
    if ( this.message !== '' ) {
      this.events.publish('message:send',this.message);

      this.messages = this.messagesService.getMessages();

      this.message = '';
    }
  }
}
