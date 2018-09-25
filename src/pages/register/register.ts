import { Component } from '@angular/core';
import { NavController, LoadingController,AlertController } from 'ionic-angular';

import { AuthenticationService } from '../../services/authentication.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { Form } from '../../Libs/Form';
import { LogIn } from '../login/login';
import { Config } from '../../Libs/Config';
import { SecureDataStorage } from '../../Libs/SecureDataStorage';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'page-register',
  templateUrl: 'register.html',
  providers:[ErrorResolverService]
})
export class Register {
  private user = {
    email:'',
    password:'',
    confirmPassword:'',
    username:'',
    deviceInfo:{}
  }

  private errors:string[];
  private isAgreeToTermsChecked:boolean = false;
  private showTermsOfUse:boolean = false;

  private toggleTermsOfUse():void {
    this.showTermsOfUse = !this.showTermsOfUse;
  }

  constructor(
    private navCtrl: NavController,
    private authenticationService:AuthenticationService,
    private errorResolverService:ErrorResolverService,
    private loadingController:LoadingController,
    private alertController:AlertController,
    private networkService:NetworkService
  ) { }

  private async ionViewWillEnter() {
    if ( Config.getConfig('IS_PRODUCTION') ) {
      // check if some device info params are null, if they are
      // user will not be able to sign up from this mobile device
      if ( !Config.checkIfDeviceInfoAvailable()  ) {
        this.alertController.create({
          title:'Device Error',
          message:`No access to informations about this device. You can't create an account from this device`,
          buttons:['OK']
        }).present();
      }

      const secureStorageAvailable =  await SecureDataStorage.Instance().checkIfSSAvailable();

      if ( !secureStorageAvailable ) {
        this.alertController.create({
          title:'Security Error.',
          message:`Please enable screen lock on your device. This application will not work without it.`
        }).present();
      }
    }
  }
 
  private checkIfUsernameEmailExists(username:string,email:string) {
    return new Promise((resolve,reject) => {
      this.authenticationService.checkEmailUsername({ username,email })
        .subscribe((res) => {
          resolve(res);
        },(err) => {
          reject(err);
        })
    });
  }

  private createFormObj():Form {
    const usernameRegex = '^[a-zA-Z0-9\\._]{5,20}$';
    const passwordRegex = '^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z._]{8,16}$';

    const form = new Form({
      username:`bail|required|minlength:5|maxlength:20|regex:${usernameRegex}`,
      password:`bail|required|minlength:8|maxlength:16|regex:${passwordRegex}:g|same:confirmPassword`,
      confirmPassword:'required',
      email:'bail|required|email'
    });

    form.setCustomErrorMessages({
      username:[
        ['required','Username is required'],
        ['minlength','Minimum of 5 characters for username.'],
        ['maxlength','Maximum of 20 characters for username'],
        ['regex','Only digits, letters, "." and "_" characters are allowed for username.']
      ],
      password:[
        ['required','Password is required'],
        ['minlength','Password needs to have between 8 and 16 characters'],
        ['maxlength','Password is too long'],
        ['regex','Password must containt one digit, and one uppercase letter. Numbers, letters "." and "_" are allowed'],
        ['same','Passwords doesn"t match.']
      ],
      confirmPassword:[
        ['required','Confirm your password']
      ],
      email:[
        ['required','Email is required'],
        ['email','Please enter valid email']
      ]
    });

    return form;
  }

  private async register() {
    if ( !this.networkService.hasInternetConnection() ){
      return await this.alertController.create({
        title:'Connection Error',
        message:'No internet connection.',
        buttons:['OK']
      }).present();
    }

    let loadingValidatingEmailUsername;

    try {
      const form = this.createFormObj();

      form.bindValues(this.user);
      form.validate();

      if ( !form.isValid() ) {
        return this.errors = form.errorMessages();
      }

      if ( !this.isAgreeToTermsChecked ) {
        return await this.alertController.create({
          title:'Terms of use.',
          subTitle:'To continue, agree with our terms of use!',
          buttons:['OK']
        }).present();
      }

      loadingValidatingEmailUsername = this.loadingController.create({
        spinner:'bubbles',
        content:'Validating...'
      });

      await loadingValidatingEmailUsername.present();

      const checkIfExists:any = await this.checkIfUsernameEmailExists(this.user.username,this.user.email);

      const errors = [];
      
      if ( checkIfExists.usernameAlreadyExists ) {
        errors.push('Username already exists');
      }

      if ( checkIfExists.emailAlreadyExists ) {
        errors.push('Email already exists');
      }

      if ( errors.length > 0 ) {
        this.errors = errors;

        return;
      }
    } catch(e) {
      return this.errorResolverService.presentAlertError('Registration Failed',e.errorCode);
    } finally{
      if ( loadingValidatingEmailUsername ) {
        await loadingValidatingEmailUsername.dismiss();
      }
    }

    this.errors = null;

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Registration started'
    });

    await loading.present();

    this.user.deviceInfo = Config.getDeviceInfo();

    this.authenticationService.register(this.user).subscribe(async(response) => {
      await loading.dismiss();

      if ( response.success ) {
        this.user = {
          email:'',
          password:'',
          confirmPassword:'',
          username:'',
          deviceInfo:{}
        };

        const alert = this.alertController.create({
          title:'Registration Sucessfull',
          subTitle:'Confirm your email and and you can log in!',
          buttons:['OK']
        });

        await alert.present();

        alert.onDidDismiss(() => this.navCtrl.setRoot(LogIn));
      } else {
        this.errorResolverService.presentAlertError('Registration Failed',response.errorCode);
      }
    },(err) => {
      loading.dismiss();
      this.errorResolverService.presentAlertError('Registration Failed',err.errorCode);
    });
  }
}