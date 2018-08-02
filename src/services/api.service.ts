import { Injectable } from '@angular/core';
import { Http , Headers } from '@angular/http';
import { Storage } from '@ionic/storage';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

@Injectable()
export class APIService {
  private token;
  private mainURL = 'http://localhost:3000/';
  private deleteInitialMessagesURL:string = this.mainURL + 'api/messages/delete_messages/';
  private initialMessagesURL:string = this.mainURL + 'api/messages/';
  private dismissAllNotificationsURL:string = this.mainURL + 'api/notifications/dismiss_all';
  private dismissOneNofiticationURL:string = this.mainURL + 'api/notifications/dismiss'
  private getAllFriendsURL:string = this.mainURL + 'api/friends';
  private confirmFriendURL:string = this.mainURL + 'api/friends/confirm_friend';
  private addFriendURL:string = this.mainURL + 'api/friends/add_friend';
  private notificationsURL:string = this.mainURL + 'api/notifications/';
  private isLoggedInURL:string = this.mainURL + 'api/login/check_login';
  private searchURL:string = this.mainURL + 'api/search';

  constructor(
    private http:Http,
    private storage:Storage
  ) { 

  }

  public setToken(token):void {
    this.token = token;
  }

  public isLoggedIn() {
    return new Promise((resolve,reject) => {
      this.getToken().then((token) => {
        if ( !token ) {
          return reject('Not authorized');
        }

        const headers = new Headers();

        headers.append('Authorization','JWT ' + token);

        this._sendTokenAndVerify(headers)
        .subscribe((res) => {
          if ( res.isLoggedIn === true ) {
            resolve(true);
          } else {
            reject('not authorized');
          }
        },(err) => {
           reject('not authorized');
        });
      }).catch((err) => {
        return reject(err);
      });
    });
  }

  public getNotifications() {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.get(this.notificationsURL,{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public dismissNotification(notificationID:string) {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.post(this.dismissOneNofiticationURL,{ notificationID },{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public dismissAllNotifications() {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.post(this.dismissAllNotificationsURL,{  },{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public getAllFriends() {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.get(this.getAllFriendsURL,{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));    
  }

  public addFriend(id:string) {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.post(this.addFriendURL,{ id },{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public confirmFriendRequest(id:string) {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.post(this.confirmFriendURL,{ id },{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public searchFriends(q:string) {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.post(this.searchURL,{ q },{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public getInitialMessages() {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.get(this.initialMessagesURL,{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  public deleteInitialMessages(userID:number) {
    const headers = new Headers();

    headers.append('Content-Type','application/json');
    headers.append('Authorization','JWT ' + this.token);

    return this.http.post(this.deleteInitialMessagesURL,{ userID },{ headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error || 'Server error'));
  }

  private _sendTokenAndVerify(headers) {
    return this.http.get(this.isLoggedInURL , { headers })
      .map(res => res.json())
      .catch((error) => Observable.throw(error.json() || 'Server error'))
  }

  public getToken() {
    return new Promise((resolve,reject) => {
      this.storage.get('token').then((token) => {
        resolve(token);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}