import { Component } from '@angular/core';
import { NavController, NavParams, LoadingController,AlertController, Alert } from 'ionic-angular';

import { AuthenticationService } from '../../services/authentication.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { Form } from '../../Libs/Form';
import { LogIn } from '../login/login';
import { Config } from '../../Libs/Config';

@Component({
  selector: 'page-register',
  templateUrl: 'register.html',
  providers:[AuthenticationService,ErrorResolverService]
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

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private authenticationService:AuthenticationService,
    private errorResolverService:ErrorResolverService,
    private loadingController:LoadingController,
    private alertController:AlertController
  ) {}

  private checkIfUsernameEmailExists(username:string,email:string) {
    return new Promise((resolve,reject) => {
      this.authenticationService.checkEmailUsername({username,email})
        .subscribe((res) => {
          resolve(res);
        },(err) => {
          reject(err);
        })
    });
  }

  private createFormObj():Form {
    const usernameRegex = '^[a-zA-Z0-9\\._]{5,20}$';
    const passwordRegex = '^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z._]{8,25}$';

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
        ['maxlength','Maximum of 15 characters for username'],
        ['regex','Only digits, letters, "." and "_" characters are allowed for username.']
      ],
      password:[
        ['required','Password is required'],
        ['minlength','Password needs to have between 8 and 16 characters'],
        ['maxlength','Password is too long'],
        ['regex','Password must containt one digit, and one uppercase letter. Numbers, letters "\." and "_" are allowed'],
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
    const form = this.createFormObj();

    form.bindValues(this.user);
    form.validate();

    if ( !form.isValid() ) {
      return this.errors = form.errorMessages();
    }

    const loadingValidatingEmailUsername = this.loadingController.create({
      spinner:'bubbles',
      content:'Validating...'
    });

    loadingValidatingEmailUsername.present();

    const checkIfExists:any = await this.checkIfUsernameEmailExists(this.user.username,this.user.email);

    loadingValidatingEmailUsername.dismiss();
    
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

    this.errors = null;

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Registration started'
    });

    loading.present();

    // attach device info
    this.user.deviceInfo = Config.getDeviceInfo();

    this.authenticationService.register(this.user)
    .subscribe(response => {
      loading.dismiss();

      if ( response.success === true ) {
        this.user = {
          email:'',
          password:'',
          confirmPassword:'',
          username:'',
          deviceInfo:{}
        };

        const alert = this.alertController.create({
          title:'Registration Sucessfull',
          subTitle:'Confirm your email and start chatting :)',
          buttons:['dismiss']
        });

        alert.present();

        this.navCtrl.push(LogIn);
      } else {
        this.errorResolverService.presentAlertError('Registration Failed',response.errorCode);
      }
    },(err) => {
      loading.dismiss();
      this.errorResolverService.presentAlertError('Registration Failed',err.errorCode);
    });
  }
}
