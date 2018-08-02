import { Component } from '@angular/core';
import { NavController, NavParams , Events } from 'ionic-angular';

import { APIService } from '../../services/api.service';

@Component({
  selector: 'page-search',
  templateUrl: 'search.html'
})
export class Search {
  private searchQuery:string = '';
  private users = [];

  constructor(
    private apiService:APIService,
    private events:Events
  ) {

  }

  ionViewDidLoad() {
    
  }

  private addFriend(id_user:string):void {
    this.apiService
    .addFriend(id_user)
    .subscribe((res) => {
      console.log(res);
    },(err) => {
      console.log(err);
    });

  }

  private search():void {
    this.apiService
    .searchFriends(this.searchQuery)
    .subscribe((response) => {
      this.users = response.result;
    },(err) => {
      console.log(err);
    });
  }

}
