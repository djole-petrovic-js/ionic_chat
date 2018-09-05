import { Component } from '@angular/core';
import { NavController , Events, LoadingController, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Register } from '../register/register';
import { AuthenticationService } from '../../services/authentication.service';
import { APIService } from '../../services/api.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { TokenService } from '../../services/token.service';
import { Config } from '../../Libs/Config';
import { Form } from '../../Libs/Form';

@Component({
  selector: 'page-home',
  templateUrl: 'login.html',
  providers:[AuthenticationService,ErrorResolverService,TokenService]
})
export class LogIn {
  private user = {
    email:'',
    password:'',
    deviceInfo:{}
  };

  private userInfo;
  private pin;

  constructor(
    private navCtrl: NavController,
    private authenticationService:AuthenticationService,
    private apiService:APIService,
    private tokenService:TokenService,
    private storage:Storage,
    private events:Events,
    private errorResolverService:ErrorResolverService,
    private loadingController:LoadingController,
    private alertController:AlertController
  ) { }

  async ionViewWillEnter() {
    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Loading...'
    });

    loading.present();

    const isLoggedIn = await this.tokenService.checkStatusOnResume();

    if ( isLoggedIn ) {
      loading.dismiss();
      return this.events.publish('user:loggedin');
    }

    this.userInfo = await Config.getInfo();

    loading.dismiss();
  }

  private logIn() {
    if ( !(this.user.email && this.user.password ) ) {
      const alert = this.alertController.create({
        title:'Login',
        subTitle:'Missing Credentials',
        buttons:['OK']
      });

      alert.present();
      return;
    }

    this.user.deviceInfo = Config.getDeviceInfo();

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Logging in...'
    });

    loading.present();

    this.authenticationService.logIn(this.user).subscribe(async(response) => {
      loading.dismiss();
      this._onSuccessfullLogin(response);
    },(err) => {
      loading.dismiss();

      this.errorResolverService.presentAlertError('Login Error',err.errorCode);
    });
  }

  private logInWithPin() {
    const form = new Form({
      pin:'bail|required|regex:^[1-9][0-9]{3}$'
    });

    form.setCustomErrorMessages({
      pin:[
        ['required','PIN is required.'],
        ['regex','Enter valid PIN.']
      ]
    });

    form.bindValues({ pin:this.pin });
    form.validate();
    
    if ( !form.isValid() ) {
      const alert = this.alertController.create({
        title:'PIN',
        message:form.errorMessages()[0]
      });

      return alert.present();
    }

    const body = { pin:this.pin,deviceInfo:Config.getDeviceInfo() };

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Logging in...'
    });

    loading.present();

    this.authenticationService.logIn(body).subscribe(async(response) => {
      loading.dismiss();
      this._onSuccessfullLogin(response);
    },(err) => {
      loading.dismiss();

      this.errorResolverService.presentAlertError('Login Error',err.errorCode);
    });
  }

  private async _onSuccessfullLogin(response) {
    if ( response.success === true ) {
      this.apiService.setToken(response.token);
      this.authenticationService.storeToken(response.token);
      
      try {
        await Promise.all([
          this.storage.set('token',response.token),
          this.storage.set('refreshToken',response.refreshToken)
        ]);

        this.events.publish('user:loggedin');
      } catch(e) {
        this.alertController.create({
          title:'Login Error',
          message:'Error occured while trying to log you in, please try again.'
        }).present();
      }
    } else {
      this.errorResolverService.presentAlertError('Login Error',response.errorCode);
    }
  }

  private async resendConfirmationEmail() {
    if ( !(this.user.email && this.user.password ) ) {
      const alert = this.alertController.create({
        title:'Resending Email',
        subTitle:'Missing Credentials',
        buttons:['OK']
      });

      alert.present();
      return;
    }

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Sending...'
    });

    loading.present();

    this.authenticationService.resendConfirmationEmail({
      email:this.user.email, password:this.user.password
    }).subscribe((response) => {
      loading.dismiss();

      if ( response.success === true ) {
        const alert = this.alertController.create({
          title:'Resending Email',
          subTitle:'Successfully sent. You can now activate your account.',
          buttons:['OK']
        });
  
        alert.present();

        this.user = {
          email:'',
          password:'',
          deviceInfo:{}
        }
      } else {
        this.errorResolverService.presentAlertError('Resending Email Error',response.errorCode);
      }
    },(err) => {
      err = err.err ? err.err : err;

      loading.dismiss();
      this.errorResolverService.presentAlertError('Resending Email Error',err.errorCode);
    });
  }

  private signUp():void {
    this.navCtrl.push(Register);
  }
}
