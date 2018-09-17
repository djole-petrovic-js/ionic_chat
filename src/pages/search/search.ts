import { Component } from '@angular/core';
import { AlertController, LoadingController } from 'ionic-angular';
import { APIService } from '../../services/api.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { FriendsService } from '../../services/friends.service';

@Component({
  selector: 'page-search',
  templateUrl: 'search.html',
  providers:[ErrorResolverService]
})
export class Search {
  private searchQuery:string = '';
  private users = null;

  constructor(
    private apiService:APIService,
    private friendsService:FriendsService,
    private errorResolverService:ErrorResolverService,
    private alertController:AlertController,
    private loading:LoadingController
  ) { }

  private addFriend(id_user:string,username:string):void {
    this
      .apiService
      .addFriend(id_user)
      .subscribe((res) => {
        if ( res.success !== true ) {
          return this.errorResolverService.presentAlertError('Error',res.errorCode);
        }

        this.alertController.create({
          title:'Success',
          subTitle:`
            Successfully added to your friend list! 
            You can start chatting as soon as the person confirm your request.
          `,
          buttons:['OK']
        }).present();

        this.friendsService.addToPendingRequest({ id_user,username });

        const userIndex = this.users.findIndex(x => x.id_user === id_user);

        if ( userIndex !== -1 ) {
          this.users.splice(userIndex, 1);
        }
      },(err) => {
        this.errorResolverService.presentAlertError('Error',err.errorCode);
      });
  }

  private search():void {
    if ( !this.searchQuery ) return;

    const loading = this.loading.create({
      content:'Searching...',
      spinner:'bubbles'
    });

    loading.present();

    this
      .apiService
      .searchFriends(this.searchQuery)
      .subscribe((response) => {
        loading.dismiss();
        this.users = response.result;
      },(err) => {
        loading.dismiss();
        this.errorResolverService.presentAlertError('Error',err.errorCode);
      });
  }
}