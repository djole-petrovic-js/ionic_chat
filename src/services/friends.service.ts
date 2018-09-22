import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { Events } from 'ionic-angular';

@Injectable()
export class FriendsService {
  private pendingRequests;
  private friends = [];
  private friendsLoaded:boolean = false;

  constructor(
    private apiService:APIService,
    private events:Events
  ) {
    this.events.subscribe('user:logout',() => {
      this.pendingRequests = null;
      this.friends = [];
      this.friendsLoaded = false;
    });
    // comes from socket io
    // removes friend that is deleting you from your users list.
    this.events.subscribe('friend_you_removed',(data) => {
      const friendIndex = this.friends.findIndex(x => x.id_user === data.IdUserRemoving);

      if ( friendIndex !== -1 ) {
        this.friends.splice(friendIndex,1);
      }
    });
    // works localy, delete a friend from your users list
    this.events.subscribe('friends:friends-removed',(data) => {
      const friendIndex = this.friends.findIndex(x => x.id_user === data.IdFriendToRemove);

      if ( friendIndex !== -1 ) {
        this.friends.splice(friendIndex,1);
      }
    });
  }

  public async getPendingRequets() {
    try {
      if ( this.pendingRequests ) {
        return this.pendingRequests;
      }
      this.pendingRequests = await this.apiService.getPendingRequests();

      return this.pendingRequests;
    } catch(e) {
      throw e;
    }
  }

  public areFriendsLoaded():boolean {
    return this.friendsLoaded;
  }

  public addToPendingRequest(friend) {
    this.pendingRequests.push(friend);
  }

  public removePendingRequest({ friend }) {
    const index = this.pendingRequests.findIndex(x => x.id_user === friend.id_user);

    if ( index !== -1 ) {
      this.pendingRequests.splice(index,1);
    }
  }

  public removeFriend(id_user) {
    const friendIndex = this.friends.findIndex(x => x.id_user === id_user);

    if ( friendIndex !== -1 ) {
      this.friends.splice(friendIndex,1);
    }
  }

  public forceNewLoad():void {
    this.friendsLoaded = false;
  }

  public userLogIn(data):void {
    this.friends.find(x => x.id_user === data.friendID).online = 1;
  }

  public userLogOut(data):void {
    this.friends.find(x => x.id_user === data.friendID).online = 0;
  }

  public addFriend({ friend }):void {
    const ifExistsIndex:number = this.friends.findIndex(x => x.id_user === friend.id_user);

    if ( ifExistsIndex === -1 ) {
      this.friends.push(friend);
    }
  }

  public deleteFriend(IdFriendToRemove) {
    return new Promise((resolve,reject) =>{
      this.apiService.deleteFriend(IdFriendToRemove)
        .subscribe((response) => {
          if ( response.success !== true ) {
            return reject(response);
          }

          resolve(response);
        },(err) => {
          reject(err);
        });
    });
  }

  public async cancelRequest(idUser:number) {
    return await this.apiService.cancelRequest({ id_user:idUser });
  }

  public getFriends() {
    return new Promise((resolve,reject) => {
      if ( this.friendsLoaded ) {
        return resolve(this.friends);
      }

      this.apiService.getAllFriends().subscribe((res) => {
          this.friendsLoaded = true;
          this.friends = res;

          resolve(res);
        },(err) => {
          reject(err);
        });
    });
  }
}