import { Component } from '@angular/core';
import { Events, LoadingController, AlertController } from 'ionic-angular';
import { Platform } from 'ionic-angular';
import { AuthenticationService } from '../../services/authentication.service';
import { APIService } from '../../services/api.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { TokenService } from '../../services/token.service';
import { SocketService } from '../../services/socket.service';
import { Config } from '../../Libs/Config';
import { Form } from '../../Libs/Form';
import { SecureDataStorage } from '../../Libs/SecureDataStorage';
import { PincodeController, PinCode } from 'ionic2-pincode-input';
import { NetworkService } from '../../services/network.service';
import { AppService } from '../../services/app.service';

@Component({
  selector:'page-home',
  templateUrl:'login.html',
  providers:[ErrorResolverService]
})
export class LogIn {
  private user = {
    email:'',
    password:'',
    deviceInfo:{}
  };

  private switchLoginForms:boolean;
  private userInfo;
  private pinCodeController:PinCode;

  constructor(
    private networkService:NetworkService,
    private socketService:SocketService,
    private authenticationService:AuthenticationService,
    private apiService:APIService,
    private tokenService:TokenService,
    private events:Events,
    private errorResolverService:ErrorResolverService,
    private loadingController:LoadingController,
    private alertController:AlertController,
    private platform:Platform,
    private pincodeCtrl:PincodeController,
    private appService:AppService
  ) { }

  async ionViewWillEnter() {
    await this.platform.ready();

    if ( !this.networkService.hasInternetConnection() ){
      this.alertController.create({
        title:'Connection Error',
        message:'No internet connection.',
        buttons:['OK']
      }).present();
    }

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Loading...',
      dismissOnPageChange:true 
    });

    try {
      await loading.present();
      await SecureDataStorage.Instance().initStorage();

      const isLoggedIn = await this.tokenService.checkLoginStatus();

      if ( isLoggedIn ) {
        const isOnWifi = await this.networkService.connectedViaWiFi();

        if ( isOnWifi ) {
          await Promise.all([
            this.apiService.deleteOperations({  }),
            this.apiService.changeLoginStatus({ status:1 }),
          ]);
        } else {
          await this.apiService.bundledStartupOperations({ status:1 });
        }

        await this.appService.loadData();
        this.appService.setShouldAskForPIN(true);
        loading.dismiss();

        return this.events.publish('user:loggedin');
      }
      
      try { await loading.dismiss(); } catch(e) { }

      const userInfo = await Config.getInfo();

      this.userInfo = userInfo.info;
      this.switchLoginForms = !!userInfo.default;

      if ( this.userInfo.pin_login_enabled ) {
        await this.showPinForm();
      }
    } catch(e) {
      const userInfo = await Config.getInfo();

      this.userInfo = userInfo.info;
      this.switchLoginForms = !!userInfo.default;

      this.alertController.create({
        title:'Notification',
        subTitle:`Application failed to initialize. Please make sure you have internet connection. Also, make sure you
          have pattern or PIN enabled on your device, application won't work without it.`,
        buttons:['OK']
      }).present();
    } finally {
      try { await loading.dismiss(); } catch(e) { }
    }
  }

  private switchToPINLoginForm() {
    this.userInfo.pin_login_enabled = 1;
  }

  private logIn() {
    if ( !(this.user.email && this.user.password) ) {
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

    this.authenticationService.logIn(this.user).subscribe((response) => {
      loading.dismiss();
      this._onSuccessfullLogin(response);
    },(err) => {
      loading.dismiss();

      this.errorResolverService.presentAlertError('Login Error',err.errorCode);
    });
  }

  private async showPinForm() {
    this.pinCodeController = await this.pincodeCtrl.create({
      title:'Enter your PIN',
      passSize:4,
      hideForgotPassword:true,
      pinHandler:this.logInWithPin.bind(this),
      enableBackdropDismiss:true
    });
 
    await this.pinCodeController.present();
  }

  private async logInWithPin(pin:string) {
    const form = new Form({
      pin:'bail|required|regex:^[1-9][0-9]{3}$'
    });

    form.setCustomErrorMessages({
      pin:[
        ['required','PIN is required.'],
        ['regex','Enter valid PIN.']
      ]
    });

    form.bindValues({ pin });
    form.validate();
    
    if ( !form.isValid() ) {
      const alert = this.alertController.create({
        title:'PIN',
        message:form.errorMessages()[0],
        buttons:['OK']
      });

      await alert.present();

      return Promise.reject(false);
    }

    const body = { pin,deviceInfo:Config.getDeviceInfo() };

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Logging in...'
    });

    loading.present();

    try {
      const response = await this.authenticationService.logIn(body).toPromise();

      await this.pinCodeController.dismiss();
      await this._onSuccessfullLogin(response);

      loading.dismiss();

      return Promise.resolve(true);
    } catch(e) {
      loading.dismiss();
      this.errorResolverService.presentAlertError('Login Error',e.errorCode);

      return Promise.reject(false);

    }
  }

  private async _onSuccessfullLogin(response) {
    if ( response.success ) {
      this.apiService.setToken(response.token);

      try {
        await Promise.all([
          SecureDataStorage.Instance().set('token',response.token),
          SecureDataStorage.Instance().set('refreshToken',response.refreshToken),
          SecureDataStorage.Instance().set('socketIoToken',response.socketIoToken)
        ]);

        const isOnWifi = await this.networkService.connectedViaWiFi();

        if ( isOnWifi ) {
          await Promise.all([
            this.apiService.deleteOperations({  }),
            this.apiService.changeLoginStatus({ status:1 }),
          ]);
        } else {
          await this.apiService.bundledStartupOperations({ status:1 });
        }

        await this.appService.loadData();
        
        this.events.publish('user:loggedin');
      } catch(e) {
        this.alertController.create({
          title:'Login Error',
          message:'Error occured while trying to log you in, please try again.',
          buttons:['OK']
        }).present();
      }
    } else {
      this.errorResolverService.presentAlertError('Login Error',response.errorCode);
    }
  }

  private async resendConfirmationEmail() {
    if ( !(this.user.email && this.user.password) ) {
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

      if ( response.success ) {
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
}