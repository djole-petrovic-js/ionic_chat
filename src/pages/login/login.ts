import { Component } from '@angular/core';
import { Events, LoadingController, AlertController } from 'ionic-angular';
import { Network } from 'ionic-native';
import { Platform } from 'ionic-angular';
import { AuthenticationService } from '../../services/authentication.service';
import { APIService } from '../../services/api.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { TokenService } from '../../services/token.service';
import { SocketService } from '../../services/socket.service';
import { SettingsService } from '../../services/settings.service';
import { Config } from '../../Libs/Config';
import { Form } from '../../Libs/Form';
import { SecureDataStorage } from '../../Libs/SecureDataStorage';
import { PincodeController, PinCode } from 'ionic2-pincode-input';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'page-home',
  templateUrl: 'login.html',
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
    private settingsService:SettingsService,
    private events:Events,
    private errorResolverService:ErrorResolverService,
    private loadingController:LoadingController,
    private alertController:AlertController,
    private platform:Platform,
    private pincodeCtrl:PincodeController,
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
      dismissOnPageChange: true 
    });

    loading.present();

    const isLoggedIn = await this.tokenService.checkLoginStatus();

    if ( isLoggedIn ) {
      loading.dismiss();

      this.settingsService.toggleMainLoadingScreen();
      // get all operations, socket service will execute just the ones
      // that are new messages, not friend request notifications etc.
      const [ { operations } ] =  await Promise.all([
        this.apiService.getSocketOperations(),
        this.apiService.changeLoginStatus({ status:1 }),
      ]);

      this.socketService.setTempOperations(operations);

      await this.apiService.deleteOperations({  });

      return this.events.publish('user:loggedin');
    }

    await loading.dismiss();

    const userInfo = await Config.getInfo();

    this.userInfo = userInfo.info;
    this.switchLoginForms = !!userInfo.default;

    if ( this.userInfo.pin_login_enabled ) {
      await this.showPinForm();
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

  private logInWithPin(pin:string) {
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

      return alert.present();
    }

    const body = { pin,deviceInfo:Config.getDeviceInfo() };

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Logging in...'
    });

    loading.present();

    this.authenticationService.logIn(body).subscribe(async(response) => {
      await this.pinCodeController.dismiss();
      await this._onSuccessfullLogin(response);

      loading.dismiss();
      this.pinCodeController = null; 
    },(err) => {
      loading.dismiss();
      this.errorResolverService.presentAlertError('Login Error',err.errorCode);
    });
  }

  private async _onSuccessfullLogin(response) {
    if ( response.success ) {
      this.apiService.setToken(response.token);
      
      try {
        await Promise.all([
          SecureDataStorage.Instance().set('token',response.token),
          SecureDataStorage.Instance().set('refreshToken',response.refreshToken)
        ]);

        const { operations } = await this.apiService.getSocketOperations();

        this.socketService.setTempOperations(operations);

        await this.apiService.deleteOperations({  });
        
        this.settingsService.toggleMainLoadingScreen();
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
