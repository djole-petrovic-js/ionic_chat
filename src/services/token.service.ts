import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { APIService } from './api.service';
import { AuthenticationService } from './authentication.service';
import { Config } from '../Libs/Config';

// token lasts for 25 minutes, refresh at every 14 minutes
@Injectable()
export class TokenService {
  private _interval;
  private _intervalSeconds:number = 1000 * 60 * 14;
  private _refreshingStarted:boolean = false;

  constructor(
    private apiService:APIService,
    private authenticationService:AuthenticationService,
    private storage:Storage,
    private events:Events
  ) {
    this.events.subscribe('user:logout',() => {
      this.stopRefreshing();
    });
  }

  // if not logged in, just send refresh token!
  public async checkStatusOnResume() {
    let loggedIn = true;

    try {
      const isLoggedIn = await this.apiService.isLoggedIn();

      if ( !isLoggedIn ) {
        loggedIn = false;
      }
    } catch(e) {
      loggedIn = false;
    }

    if ( loggedIn ) true;

    // send refresh token
    try {
      const refreshToken = await this.storage.get('refreshToken');
      const deviceInfo = Config.getDeviceInfo();

      const response = await this.apiService.grantAccessToken({
        refreshToken, deviceInfo
      });

      this.apiService.setToken(response.token);
      this.authenticationService.storeToken(response.token);
      
      await this.storage.set('token',response.token);
    } catch(e) {
      return false;
    }

    return true;
  }

  public async startRefreshing() {
    if ( this._refreshingStarted ) return;

    this._refreshingStarted = true;
    this._setInterval();
  }

  private _setInterval():void {
    this._interval = window.setInterval(this._start.bind(this),this._intervalSeconds);
  }

  private _clearInterval():void {
    if ( this._interval ) {
      window.clearInterval(this._interval);
    }
  }

  private async _getAndStoreToken() {
    const response = await this.apiService.refreshToken();

    this.apiService.setToken(response.token);
    this.authenticationService.storeToken(response.token);

    await this.storage.set('token',response.token);
  }

  private async _start() {
    try {
      await this._getAndStoreToken();
    } catch(e) {
      this.authenticationService.logOut();
      this.events.publish('user:logout');
    }
  }

  public stopRefreshing():void {
    this._refreshingStarted = false;
    this._clearInterval();
  }
}