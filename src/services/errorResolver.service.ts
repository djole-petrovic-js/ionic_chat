import { Injectable } from '@angular/core';
import { AlertController } from 'ionic-angular';

@Injectable()
export class ErrorResolverService {
  private _errors = {
    // login errors
    'MISSING_CREDENTIALS':'Username or password is missing.',
    'EMAIL_PASSWORD_INCORRECT':'Email or password is incorrect.',
    'ACCOUNT_NOT_ACTIVATED':'Your account is not activated yet.',
    "LOGIN_INVALID_PIN":'PIN is not valid.',
    'LOGIN_FATAL_ERROR':'Error occured while trying to log you in, please try again.',
    // registration errors
    'REGISTER_DATA_NOT_VALID':'Please enter correct data',
    'REGISTER_USERNAME_EXISTS':'Username already exists.',
    'REGISTER_DEVICE_EXISTS':'Account is already connected with this device. Use that account instead.',
    'REGISTER_EMAIL_EXISTS':'Email already exists',
    'REGISTER_EMAIL_BANNED':'You can not use this email to create your account. It has been banned. Please use another email.',
    'EMAIL_USERNAME_LOOKUP_FAILED':'',
    'REGISTER_EMAIL_SEND_ERROR':`Your account is created, but we were unable to send you confirmation email.
    Please request another email to activate your account.`,
    'REGISTER_EMAIL_RESEND_ERROR':'Fatal error occured while resending email. Please try again.',
    'ACCOUNT_ALREADY_ACTIVATED':'Your account is already activated.',
    'REGISTER_FATAL_ERROR':'Error occured while trying to create your account, please try again.',
    // friends errors
    'FRIENDS_MISSING_DATA':'Failed to add this user to your friends list, please try again',
    'FRIENDS_ALREADY_ADDED':'You have already added this user as your friend',
    'FRIENDS_USER_ALREADY_ADDED':'This user has already added you as a friend, go confirm the request!',
    'FRIENDS_FATAL_ERROR':'Error occured while trying to add this user to your friends list. Please try later',
    'FRIENDS_ALREADY_CONFIRMED':'You have already confirmed this friend request!',
    'FRIENDS_CONFIRMING_FATAL_ERROR':'Error occured while trying to confirm this request.Please try later.',
    'PENDING_FATAL_ERROR':'Error occured while processing your pending request.',
    // notification errors
    'NOTIFICATION_FATAL_ERROR':'Error occured while dismissing. Please try later.',
    // search errors
    'SEARCH_FATAL_ERROR':'Error while searching. Please try again.',
    // messages errors
    'MESSAGES_FETCH_FAILED':'Error while getting your messages. Please restart your application',
    'MESSAGES_DELETING_FAILED':'Error while deleting your read messages. Please restart application',
    // users errors
    'USERS_PASSWORD_INVALID':'Your current password is incorrect, please try again.',
    'USERS_FATAL_ERROR':'Error while updating your profile, please try again.',
    'USERS_FETCH_INFO_FAILED':'Error while fetching your info. Please restart your application!',
    'USERS_DELETE_ACCOUNT_WRONG_PASSWORD':'Password you provided is not valid, try again!',
    'USERS_DELETE_ACCOUNT_FATAL_ERROR':'Error while deleting your account, please try again!',
    'USERS_PIN_INVALID':'PIN your provided is invalid.',
    'PIN_UNIQUE_DEVICE_OFF':"Setting 'Use app only on this device' is off. Please turn it on if you want to use PIN login",
    'UNIQUE_DEVICE_ERROR':'Operation failed. Make sure you are doing this from your registered device!',
    'DEFAULT':'Error occured, please try again.'
  }

  constructor(private alert:AlertController) {}

  public presentAlertError(title:string,errorCode:string):void {
    const alert = this.alert.create({
      title,
      subTitle:this.resolveError(errorCode),
      buttons:['dismiss']
    });

    alert.present();
  }

  public resolveError(errorCode:string):string {
    return this._errors[errorCode] || this._errors['DEFAULT'];
  }
}