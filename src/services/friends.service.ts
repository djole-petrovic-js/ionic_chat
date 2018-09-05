import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { Events } from 'ionic-angular';

@Injectable()
export class FriendsService {
  private pendingRequests = [];
  private friends = [];
  private friendsLoaded:boolean = false;

  constructor(
    private apiService:APIService,
    private events:Events
  ) {
    // comes from socket io
    // removes friend that is deleting you from your users list.
    this.events.subscribe('friend:friend-you-removed',() => this.friendsLoaded = false);
    // works localy, delete a friend from your users list
    this.events.subscribe('friends:friends-removed',() => this.friendsLoaded = false);
  }

  public async getPendingRequets() {
    return await this.apiService.getPendingRequests();
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
    this.friends.push(friend);
  }

  public deleteFriend(IdFriendToRemove) {
    return new Promise((resolve,reject) =>{
      this.apiService.deleteFriend(IdFriendToRemove)
        .subscribe((response) => {
          if ( response.success !== true ) {
            return reject(response);
          }

          const friendIndex = this.friends.findIndex(x => x.id_user === IdFriendToRemove);

          if ( friendIndex !== -1 ) {
            this.friends.splice(friendIndex,1);
          }
          
          this.friendsLoaded = false;
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
      if ( this.friendsLoaded === true ) {
        return resolve(this.friends);
      }

      this.apiService.getAllFriends()
        .subscribe((res) => {
          this.friendsLoaded = true;
          this.friends = res;

          resolve(res);
        },(err) => {
          reject(err);
        });
    });
  }
}