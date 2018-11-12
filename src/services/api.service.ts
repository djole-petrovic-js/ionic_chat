import { Injectable } from '@angular/core';
import { Http , Headers } from '@angular/http';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import { TokenService } from './token.service';

@Injectable()
export class APIService {
  private token:string;
  private mainURL = Config.getConfig('API_URL');
  private deleteMessagesURL:string = this.mainURL + 'api/messages/delete_messages/';
  private dismissAllNotificationsURL:string = this.mainURL + 'api/notifications/dismiss_all';
  private dismissOneNofiticationURL:string = this.mainURL + 'api/notifications/dismiss'
  private getAllFriendsURL:string = this.mainURL + 'api/friends';
  private confirmFriendURL:string = this.mainURL + 'api/friends/confirm_friend';
  private addFriendURL:string = this.mainURL + 'api/friends/add_friend';
  private deleteFriendURL:string = this.mainURL + 'api/friends/delete_friend';
  private notificationsURL:string = this.mainURL + 'api/notifications/';
  private searchURL:string = this.mainURL + 'api/search';
  private changePasswordURL:string = this.mainURL + 'api/users/changepassword';
  private userInfoURL:string = this.mainURL + 'api/users/userinfo';
  private refreshTokenURL:string = this.mainURL + 'api/login/refresh_token';
  private pendingRequestsURL:string = this.mainURL + 'api/friends/pending_requests';
  private cancelRequestURL:string = this.mainURL + 'api/friends/cancel_request';
  private setBinarySettingsURL:string = this.mainURL + 'api/users/set_binary_settings';
  private deleteAccountURL:string = this.mainURL + 'api/users/delete_account';
  private grantAccessTokenURL:string = this.mainURL + 'api/login/grant_access_token';
  private changePinURL:string = this.mainURL + 'api/users/change_pin';
  private changeLoginStatusURL:string = this.mainURL + 'api/login/change_login_status';
  private heartbeatURL:string = this.mainURL + 'api/login/heartbeat';
  private setFCMTokenURL:string = this.mainURL + 'api/users/set_fcm_token';
  private getMessagesURL:string = this.mainURL + 'api/messages/get_messages';
  private bundledDataURL:string = this.mainURL + 'api/users/bundled_data';
  private bundledStartupOperationsURL:string = this.mainURL + 'api/login/bundled_startup_operations';
  private deleteOperationsURL:string = this.mainURL + 'api/users/delete_operations';
  private logOutURL:string = this.mainURL + 'api/login/logout';

  constructor(
    private http:Http,
  ) { }

  public async deleteOperations(body) {
    try {
      const response = await this.http.post(this.deleteOperationsURL,body,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public setToken(token:string):void {
    this.token = token;
  }

  private _headers():Headers {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return headers;
  }

  public async logOut() {
    try {
      const response = await this.http.post(this.logOutURL,{},{ headers:this._headers() }).toPromise();

      await Promise.all([
        SecureDataStorage.Instance().remove('token'),
        SecureDataStorage.Instance().remove('refreshToken'),
        SecureDataStorage.Instance().remove('socketIoToken')
      ]);

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async bundledStartupOperations(body) {
    try {
      const response = await this.http.post(this.bundledStartupOperationsURL,body,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async bundledData() {
    try {
      const response = await this.http.get(this.bundledDataURL,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async getMessages(body) {
    try {
      const response = await this.http.post(this.getMessagesURL,body,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async setFCMToken(body) {
    try {
      const response = await this.http.post(this.setFCMTokenURL,body,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async heartbeat() {
    try {
      const response = await this.http.get(this.heartbeatURL).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async setBinarySettings(body) {
    const response = await this.http.post(this.setBinarySettingsURL,body,{ headers:this._headers() }).toPromise();

    return response.json();
  }

  public async changeLoginStatus(body) {
    try {
      const response = await this.http.post(this.changeLoginStatusURL,body,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async changePin(body) {
    try {
      const response = await this.http.post(this.changePinURL,body,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async refreshToken() {
    const response = await this.http.post(this.refreshTokenURL,{},{ headers:this._headers() }).toPromise();

    return response.json();
  }

  public async fetchUserInfo() {
    const user = await this.http.get(this.userInfoURL,{ headers:this._headers() }).toPromise();

    return user.json();
  }

  public async channgePassword(options) {
    try {
      const response = await this.http.post(this.changePasswordURL,options,{ headers:this._headers() }).toPromise();

      return response.json();
    } catch(e) {
      throw e.json();
    }
  }

  public getNotifications() {
    return this.http.get(this.notificationsURL,{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public dismissNotification(notificationID:string) {
    return this.http.post(this.dismissOneNofiticationURL,{ notificationID },{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public dismissAllNotifications() {
    return this.http.post(this.dismissAllNotificationsURL,{  },{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public async getPendingRequests() {
    const response = await this.http.get(this.pendingRequestsURL,{ headers:this._headers() }).toPromise();

    return response.json();
  }

  public async cancelRequest(body) {
    const response = await this.http.post(this.cancelRequestURL,body,{ headers:this._headers() }).toPromise();

    return response.json();
  }

  public getAllFriends() {
    return this.http.get(this.getAllFriendsURL,{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));    
  }

  public addFriend(id:string) {
    return this.http.post(this.addFriendURL,{ id },{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public deleteFriend(IdFriendToRemove) {
    return this.http.post(this.deleteFriendURL,{ IdFriendToRemove },{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public confirmFriendRequest(id:string) {
    return this.http.post(this.confirmFriendURL,{ id },{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public searchFriends(q:string) {
    return this.http.post(this.searchURL,{ q },{ headers:this._headers() })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public async deleteMessages() {
    try {
      const res = await this.http.post(this.deleteMessagesURL,{ },{ headers:this._headers() }).toPromise();

      return res.json();
    } catch(e) {
      throw e.json();
    }
  }

  public async deleteAccount(body) {
    const response = await this.http.post(this.deleteAccountURL,body,{ headers:this._headers() }).toPromise();

    return response.json();
  }

  public async grantAccessToken(body) {
    const headers = new Headers();

    headers.append('Content-Type','application/json');

    const response = await this.http.post(this.grantAccessTokenURL,body,{ headers }).toPromise();

    return response.json();
  }
}