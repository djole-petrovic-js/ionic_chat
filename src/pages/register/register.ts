import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'page-register',
  templateUrl: 'register.html',
  providers:[AuthenticationService]
})
export class Register {
  private email:string = '';
  private password:string = '';
  private confirmPassword:string = '';
  private username:string = '';

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private authenticationService:AuthenticationService
  ) {}

  private register():void {
    this.authenticationService.register({
      email:this.email,
      password:this.password,
      confirmPassword:this.confirmPassword,
      username:this.username
    })
    .subscribe( response => {
      console.log(response);
    });
  }
}
