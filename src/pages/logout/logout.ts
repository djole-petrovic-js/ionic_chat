import { Component } from '@angular/core';
import { NavController, NavParams, Events } from 'ionic-angular';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'page-logout',
  templateUrl: 'logout.html'
})
export class Logout {

  constructor(private events:Events, private authenticationService:AuthenticationService) {
    
  }

  ionViewWillEnter() {
    this.authenticationService.logOut();
    this.events.publish('user:logout');
  }
}
