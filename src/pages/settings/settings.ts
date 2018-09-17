import { Component } from '@angular/core';
import { LoadingController,AlertController,Events } from 'ionic-angular';

import { FriendsService } from '../../services/friends.service';
import { ErrorResolverService } from '../../services/errorResolver.service';
import { Form } from '../../Libs/Form';
import { Config } from '../../Libs/Config';
import { APIService } from '../../services/api.service';
import { AuthenticationService } from '../../services/authentication.service';
import { SettingsService } from '../../services/settings.service';
import { SecureDataStorage } from '../../Libs/SecureDataStorage';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
  providers:[ErrorResolverService]
})
export class Settings {
  private friends;

  // ion toggle change unnecessarily triggers change event
  // checks if first time called, if so just return
  private calledTogglingMethods = {
    toggleOfflineMessages:0,
    toggleUniqueDevice:0,
    togglePinAuth:0
  };

  private user;
  private isToggled = false;
  private isUniqueDeviceToggled = false;
  private isPinAuthToggled = false;

  constructor(
    private friendsService:FriendsService,
    private errorResolverService:ErrorResolverService,
    private loadingController:LoadingController,
    private alertController:AlertController,
    private events:Events,
    private apiService:APIService,
    private authenticationService:AuthenticationService,
    private settingsService:SettingsService
  ) { }

  async ionViewWillEnter() {
    try {
      [this.friends,this.user] = await Promise.all([
        this.friendsService.getFriends(),
        this.settingsService.fetchSettings()
      ]);

      this.isToggled = this.user.allow_offline_messages;
      this.isUniqueDeviceToggled = this.user.unique_device;
      this.isPinAuthToggled = this.user.pin_login_enabled;

      await Config.storeInfo({
        pin_login_enabled:this.user.pin_login_enabled
      });

      // if it is false, it wont trigger ionchange
      // so call methods right away!
      if ( !this.user.allow_offline_messages ) this.calledTogglingMethods.toggleOfflineMessages = 1;

      if ( !this.user.unique_device ) {
        this.calledTogglingMethods.toggleUniqueDevice = 1;
      }

      if ( !this.user.pin_login_enabled ) {
        this.calledTogglingMethods.togglePinAuth = 1;
      }
    } catch(e) {
      this.errorResolverService.presentAlertError('Friends List Error',e.errorCode);
    }
  }
  
  private async togglePinAuth() {
    if ( this.calledTogglingMethods.togglePinAuth < 1 ) {
      this.calledTogglingMethods.togglePinAuth++

      return;
    }

    const togglePinAuthValue = this.isPinAuthToggled ? 1 : 0;
    
    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Changing...'
    });

    loading.present();

    try {
      await this.apiService.setBinarySettings({
        setting:'pin_login_enabled',
        value:togglePinAuthValue
      });

      const alert = this.alertController.create({
        title:'Success',
        message:'Successfully changed PIN login mode!',
        buttons:['OK']
      });

      alert.present();

      await Config.updateInfo('pin_login_enabled',togglePinAuthValue);
      this.settingsService.setSetting('pin_login_enabled',togglePinAuthValue);
    } catch(e) {
      this.isPinAuthToggled = !this.isPinAuthToggled;
      this.calledTogglingMethods.togglePinAuth = 0;

      e = e.json();
      // if failed, that means user needs to enter pin for the first time
      // later on , textbox should be added so user can change pin
      if ( e.errorCode === 'PIN_SETTING_FIRST_TIME' ) {
        const alert = this.alertController.create({
          title:'Set Pin',
          message:'Enter a 4 digit PIN eg 1234. Leading zero is not allowed.',
          inputs:[{
            name:'pin',
            placeholder:'PIN',
            type:'password'
          },{
            name:'pinConfirmed',
            placeholder:'Confirm',
            type:'password'
          }],
          buttons:[{
            text:'Set',
            handler:({ pin,pinConfirmed }):any => {
              const form = new Form({
                pin:'bail|required|regex:^[1-9][0-9]{3}$|same:pinConfirmed',
                pinConfirmed:'bail|required'
              });
          
              form.setCustomErrorMessages({
                pin:[
                  ['required','PIN is required.'],
                  ['regex','Enter valid PIN (4 digit number).'],
                  ['same','Confirm your PIN']
                ]
              });
          
              form.bindValues({ pin,pinConfirmed });
              form.validate();

              if ( !form.isValid() ) {
                const alert = this.alertController.create({
                  title:'PIN',
                  message:form.errorMessages()[0],
                  buttons:['OK']
                });
          
                return alert.present();
              }

              this.changePin(pin);
            }
          },{
            text:'Cancel',
            role:'cancel'
          }]
        });

        alert.present();
      } else {
        this.errorResolverService.presentAlertError('Error',e.errorCode);
      }
    } finally {
      loading.dismiss();
    }
  }

  private async changePin(pin:string,pinConfirmed?:string,oldPin?:string) {
    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Setting PIN...'
    });

    loading.present();

    try {
      const response = await this.apiService.changePin({
        pin,pinConfirmed,oldPin,
        deviceInfo:Config.getDeviceInfo()
      });

      let message = 'PIN has been successfully set. ';

      if ( !this.user.pin_login_enabled ) {
        message += 'You can now turn on PIN login.';
      }

      if ( response.success ) {
        this.alertController.create({
          title:'PIN',
          message,
          buttons:['OK']
        }).present();
      } else {
        this.errorResolverService.presentAlertError('Error',response.errorCode);
      }
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.errorCode);
    } finally {
      loading.dismiss();
    }
  }

  // add checks before every call, if it is first time calling
  // ion change unnecessarily triggers change event first time
  // so just return 
  private async toggleOfflineMessages() {
    if ( this.calledTogglingMethods.toggleOfflineMessages < 1 ) {
      this.calledTogglingMethods.toggleOfflineMessages++

      return;
    }

    if ( [true,false].indexOf(this.isToggled) === -1 ) return;

    const allowOfflineMessagesValue = this.isToggled ? 1 : 0;

    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Changing...'
    });

    loading.present();

    try {
      await this.apiService.setBinarySettings({
        setting:'allow_offline_messages',
        value:allowOfflineMessagesValue
      });

      this.alertController.create({
        title:'Success',
        message:'Successfully changed allow offline messages mode!',
        buttons:['OK']
      }).present();

      this.settingsService.setSetting(
        'allow_offline_messages',
        allowOfflineMessagesValue
      );
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.errorCode);
    } finally {
      loading.dismiss();
    }
  }

  private async _toggleUniqueDeviceRun() {
    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Changing...'
    });

    loading.present();

    try {
      if ( [true,false].indexOf(this.isToggled) === -1 ) return;

      const uniqueDeviceValue = this.isUniqueDeviceToggled ? 1 : 0;

      await this.apiService.setBinarySettings({
        setting:'unique_device',
        value:uniqueDeviceValue
      });

      if ( uniqueDeviceValue === 0 ) {
        await Config.updateInfo('pin_login_enabled',0);

        this.settingsService.setSetting('pin_login_enabled',0);
        this.calledTogglingMethods.togglePinAuth = 0;
        this.user.isPinAuthToggled = false;
      }
      
      this.alertController.create({
        title:'Success',
        message:'Successfully changed which devices can access your account!',
        buttons:['OK']
      }).present();

      this.settingsService.setSetting(
        'unique_device',
        uniqueDeviceValue
      );
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.errorCode);
    } finally {
      loading.dismiss();
    }
  }

  private async toggleUniqueDevice() {
    if ( this.calledTogglingMethods.toggleUniqueDevice < 1 ) {
      this.calledTogglingMethods.toggleUniqueDevice++

      return;
    }

    const uniqueDeviceValue = this.isUniqueDeviceToggled ? 1 : 0;

    if ( uniqueDeviceValue === 0 ) {
      const alert = this.alertController.create({
        title:'Unique device',
        message:'Keeping this setting on will make your account much more secure. Are you sure you want to turn it off?',
        buttons:[{
          text:'Yes',
          handler:this._toggleUniqueDeviceRun.bind(this)
        },{
          text:'No',
          handler:() => {
            this.isUniqueDeviceToggled = true;
            this.calledTogglingMethods.toggleUniqueDevice = 0;
          }
        }]
      });

      alert.present();
    } else {
      this._toggleUniqueDeviceRun();
    }
  }

  private displayOfflineMessagesInfo() {
    this.alertController.create({
      title:'Offline Messages',
      message:`
        If you turn off this setting, we won't store any messages while you are offline.
        You will recieve messages only when online.
      `,
      buttons:['OK']
    }).present();
  }

  private displayUniqueDeviceInfo() {
    this.alertController.create({
      title:'Unique Device',
      message:`Device you used to create your account will be used as a unique device, allowing you to keep your
       account much more secure. You will be able to log in only from this device. If you want to log in from another
       device, you can turn this setting off.`,
       buttons:['OK']
    }).present();
  }

  private buildFormObject():Form {
    const passwordRegex = '^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z._]{8,16}$';

    const form = new Form({
      currentPassword:'bail|required',
      newPassword:`bail|required|minlength:8|maxlength:16|regex:${passwordRegex}:g|same:confirmNewPassword`,
      confirmNewPassword:'bail|required'
    });

    form.setCustomErrorMessages({
      currentPassword:[
        ['required','Current Password is required']
      ],
      newPassword:[
        ['required','New Password is required'],
        ['minlength','Password needs to have between 8 and 16 characters'],
        ['maxlength','Password is too long'],
        ['regex','Password must containt one digit, and one uppercase letter. Numbers, letters "." and "_" are allowed'],
        ['same','Passwords doesn"t match.']
      ],
      confirmNewPassword:[
        ['required','Please confirm your password']
      ]
    });

    return form;
  }

  private async confirmChangePassword() {
    this.alertController.create({
      title:'Confirm Password Changing.',
      message:'Are you sure you want to change your password?',
      buttons:[{
        text:'Yes',
        handler:() => {
          this.alertController.create({
            title:'Enter new password.',
            inputs:[
            { name:'newPassword',placeholder:'Password',type:'password'},
            { name:'confirmNewPassword',placeholder:'Confirm',type:'password' },
            { name:'currentPassword',placeholder:'Current password',type:'password' }],
            buttons:[{
              text:'Confirm',
              handler:(data) => {
                if ( !(data.newPassword && data.confirmNewPassword && data.currentPassword) ) {
                  this.alertController.create({
                    title:'Error',
                    message:'Enter all fields.',
                    buttons:['OK']
                  }).present();

                  return false;
                }

                const form = this.buildFormObject();

                form.bindValues(data);
                form.validate();

                if ( !form.isValid() ) {
                  this.alertController.create({
                    title:'Error',
                    message:form.errorMessages()[0],
                    buttons:['OK']
                  }).present();

                  return false;
                }

                data.deviceInfo = Config.getDeviceInfo();

                this.changePassword(data);
              }
            },{
              text:'Cancel',
              role:'cancel'
            }]
          }).present();
        }
      },{
        text:'Cancel',
        role:'cancel'
      }]
    }).present();
  }

  private async changePassword(body) {
    const loading = this.loadingController.create({
      content:'Changing password...',
      spinner:'bubbles'
    });

    loading.present();

    try {
      await this.apiService.channgePassword(body);

      this.alertController.create({
        title:'Password Changing',
        message:'Your password has been successfully changed!',
        buttons:['OK']
      }).present();
    } catch(e) {
      this.errorResolverService.presentAlertError('Password Error',e.errorCode);
    } finally {
      loading.dismiss();
    }
  }

  private async confirmDeleteFriend(IdFriendToRemove) {
    this.alertController.create({
      title:'Delete friend',
      message:'Are you sure you want to delete this friend?',
      buttons:[{
        text:'Cancel',
        role:'cancel'
      },{
        text:'Delete',
        handler:():any => this.deleteFriend(IdFriendToRemove)
      }]
    }).present();
  }

  private async deleteFriend(IdFriendToRemove) {
    const loading = this.loadingController.create({
      content:'Removing Friend...',
      spinner:'bubbles'
    });

    await loading.present();

    try {
      await this.friendsService.deleteFriend(IdFriendToRemove);

      this.events.publish('friends:friends-removed',{ IdFriendToRemove });
      this.friends = await this.friendsService.getFriends();
    } catch(e) {
      this.errorResolverService.presentAlertError('Error',e.errorCode);
    } finally {
      loading.dismiss();
    }
  }

  private async confirmDeleteAccount() {
    const confirmAlert = this.alertController.create({
      title:'Delete Account',
      message:'Are you sure you want to delete your account?',
      buttons:[{
        text:'Yes',
        handler:() => {
          const passwordAlert = this.alertController.create({
            title:'Password',
            message:'Enter your password.',
            inputs:[{
              placeholder:'Password...',
              name:'password',
              type:'password'
            }],
            buttons:[{
              text:'Confirm',
              handler:(data):any => {
                if ( !data.password ) {
                  return this.alertController.create({
                    title:'Delete Account',
                    message:'Enter your password.',
                    buttons:['OK']
                  }).present();
                }

                this.deleteAccount(data.password);
              }
            },{
              text:'Cancel',
              role:'cancel'
            }]
          });

          passwordAlert.present();
        }
      },{
        text:'No',
        role:'cancel'
      }]
    });

    confirmAlert.present();
  }

  private async deleteAccount(password) {
    const loading = this.loadingController.create({
      spinner:'bubbles',
      content:'Deleting account...'
    });

    loading.present();

    try {
      const response = await this.apiService.deleteAccount({
        password,
        deviceInfo:Config.getDeviceInfo()
      });

      if ( response.success !== true ) {
        this.errorResolverService.presentAlertError('Fatal Error',response.errorCode);
        return;
      }

      this.alertController.create({
        title:'Success',
        message:'Your account is now fully deleted!',
        buttons:['OK']
      }).present();
 
      SecureDataStorage.Instance().clear();
      this.authenticationService.logOut();
      this.events.publish('user:logout');
    } catch(e) {
      this.errorResolverService.presentAlertError('Fatal Error',e.errorCode);
    } finally {
      loading.dismiss();
    }
  }

  private confirmPinChange() {
    this.alertController.create({
      title:'PIN Change.',
      message:'Are you sure you want to change your PIN?',
      buttons:[{
        text:'Yes',
        handler:() => {
          this.alertController.create({
            title:'PIN Change.',
            inputs:[
              { name:'newPIN',placeholder:'PIN',type:'password' },
              { name:'confirmNewPIN',placeholder:'Confirm',type:'password' },
              { name:'currentPIN',placeholder:'Current PIN', type:'password' }
            ],
            buttons:[
              { text:'Confirm',handler:(data) => {
                if ( !(data.newPIN && data.confirmNewPIN && data.currentPIN) ) {
                  this.alertController.create({
                    title:'PIN Error',
                    message:'Enter all fields.',
                    buttons:['OK']
                  }).present();
            
                  return false;
                }

                const pinRegex = /^[1-9][0-9]{3}$/;

                if ( !(
                  data.newPIN.match(pinRegex) &&
                  data.confirmNewPIN.match(pinRegex) &&
                  data.currentPIN.match(pinRegex)
                ) ) {
                  this.alertController.create({
                    title:'PIN Error',
                    buttons:['OK'],
                    message:'Enter valid data.'
                  }).present();

                  return false;
                }

                if ( data.newPIN !== data.confirmNewPIN ) {
                  this.alertController.create({
                    title:'PIN Error',
                    message:'Confirm your PIN.',
                    buttons:['OK']
                  }).present();

                  return false;
                }

                this.changePin(data.newPIN,data.confirmNewPIN,data.currentPIN);
              } },
              { text:'Cancel',role:'cancel' }
            ]
          }).present();
        }
      },{
        text:'No',
        role:'cancel'
      }]
    }).present();
  }
}