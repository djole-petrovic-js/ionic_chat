import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { Events } from 'ionic-angular';

@Injectable()
export class FriendsService {
  private friends = [];
  private friendsLoaded:boolean = false;

  constructor(
    private apiService:APIService,
    private events:Events
  ) {

  }

  public userLogIn(data):void {
    const index:number = this._findFriend(data.friendID);

    if ( index !== -1 ) {
      this.friends[index].online = 1;
    }
  }

  public userLogOut(data):void {
    const index:number = this._findFriend(data.friendID);

    if ( index !== -1 ) {
      this.friends[index].online = 0;
    }
  }

  public addFriend({ friend }):void {
    this.friends.push(friend);
  }

  private _findFriend(id):number {
    const index:number = this.friends.findIndex(
      ({ id_user }) => id_user == id
    );

    return index;
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