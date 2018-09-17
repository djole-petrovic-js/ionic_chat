import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import { SocketService } from './socket.service';

// token lasts for 25 minutes, refresh at every 10 minutes
@Injectable()
export class TokenService {
  private _interval;
  private _intervalSeconds:number = 1000 * 60 * 10;
  private _refreshingStarted:boolean = false;

  constructor(
    private socketService:SocketService,
    private apiService:APIService,
    private events:Events
  ) {
    this.events.subscribe('user:logout',() => this.stopRefreshing());
  }

  // if not logged in, just send refresh token!
  public async checkLoginStatus() {
    let loggedIn = true;
    let minutesExpired;

    try {
      const response = await this.apiService.isLoggedIn();

      minutesExpired = response.minutesExpired;

      if ( !response.isLoggedIn ) {
        loggedIn = false;
      }
    } catch(e) {
      loggedIn = false;
    }

    if ( loggedIn ) {
      if ( minutesExpired >= 14 ) {
        await this._getAndStoreToken();

        this.stopRefreshing();
        this.startRefreshing();
      }

      return true;
    }

    try {
      const refreshToken = await SecureDataStorage.Instance().get('refreshToken');

      if ( !refreshToken ) return false;

      const { token,refreshToken:newRefreshToken } = await this.apiService.grantAccessToken({
        refreshToken, deviceInfo:Config.getDeviceInfo()
      });

      if ( newRefreshToken ) { 
        await SecureDataStorage.Instance().set('refreshToken',newRefreshToken);
      }

      this.apiService.setToken(token);
      this.socketService.setNewToken(token);
      
      await SecureDataStorage.Instance().set('token',token);
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
    try { window.clearInterval(this._interval); } catch(e) { }
  }

  private async _getAndStoreToken() {
    const response = await this.apiService.refreshToken();

    this.apiService.setToken(response.token);
    this.socketService.setNewToken(response.token);

    await SecureDataStorage.Instance().set('token',response.token);
  }

  private async _start() {
    try {
      await this._getAndStoreToken();
    } catch(e) {
      try {
        await this.checkLoginStatus();
      } catch(e) {
        throw e;
      }
    }
  }

  public stopRefreshing():void {
    this._refreshingStarted = false;
    this._clearInterval();
  }
}