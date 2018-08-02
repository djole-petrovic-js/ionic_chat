import { Component } from '@angular/core';
import { NavController , Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';

import { ChatMain } from '../chat-main/chat-main';
import { Register } from '../register/register';

import { AuthenticationService } from '../../services/authentication.service';
import { APIService } from '../../services/api.service';

@Component({
  selector: 'page-home',
  templateUrl: 'login.html',
  providers:[AuthenticationService]
})
export class LogIn {
  private email:string;
  private password:string;

  constructor(
    private navCtrl: NavController,
    private authenticationService:AuthenticationService,
    private apiService:APIService,
    private storage:Storage,
    private events:Events
  ) {

  }

  ionViewWillEnter() {
    this.apiService.isLoggedIn()
    .then((res) => {
      if ( res ) {
        this.apiService.getToken()
        .then((token) => {
          this.apiService.setToken(token);
          this.authenticationService.storeToken(token);
          this.events.publish('user:loggedin');
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
  }

  private logIn():void {
    this.authenticationService.logIn({
      email:this.email,
      password:this.password
    }).subscribe(({ success,token }) => {
      if ( success === true ) {
        this.apiService.setToken(token);
        this.authenticationService.storeToken(token);

        this
        .storage
        .set('token',token)
        .then(() => {
          this.events.publish('user:loggedin');
        });
      }
    },(err) => {
      console.log(err);
    });
  }

  private signUp():void {
    this.navCtrl.push(Register);
  }
}
