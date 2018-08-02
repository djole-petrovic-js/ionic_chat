import { Component } from '@angular/core';
import { Events } from 'ionic-angular';
import { FriendsService } from '../../services/friends.service';

@Component({
  selector: 'page-friends',
  templateUrl: 'friends.html'
})
export class Friends {
  private friends = null;

  constructor(
    private friendsService:FriendsService,
    private events:Events
  ) {
    this.events.subscribe('friends:user-confirmed',(friend) => {
      this
      .friendsService
      .getFriends()
      .then((friends) => {
        this.friends = friends;
      })
      .catch((err) => {
        console.log(err);
      }); 
    });

    this.events.subscribe('friend:login',(data) => {
      const index:number = this._findFriend(data.friendID);

      if ( index !== -1 ) {
        this.friends[index].online = 1;
      }
    });

    this.events.subscribe('friend:logout',(data) => {
      const index:number = this._findFriend(data.friendID);

      if ( index !== -1 ) {
        this.friends[index].online = 0;
      }
    });
  }

  ionViewWillEnter() {
    this
    .friendsService
    .getFriends()
    .then((friends) => {
      this.friends = friends;
    })
    .catch((err) => {
      console.log(err);
    });  
  }

  ionViewWillLeave() {
    this.events.unsubscribe('friend:login');
    this.events.unsubscribe('friend:logout');
    this.events.unsubscribe('friends:user-confirmed');
  }

  private startChatting(userOptions):void {
    this.events.publish('start:chatting',userOptions);
  }

  private _findFriend(id):number {
    const index:number = this.friends.findIndex(
      ({ id_user }) => id_user == id
    );

    return index;
  }
}
