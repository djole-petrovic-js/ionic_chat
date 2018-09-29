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

  public async checkLoginStatus():Promise<boolean> {
    try {
      const [ token,refreshToken ] = await Promise.all([
        SecureDataStorage.Instance().get('token'),
        SecureDataStorage.Instance().get('refreshToken')
      ]);

      if ( !refreshToken || !token ) return false;

      const { token:newToken,refreshToken:newRefreshToken } = await this.apiService.grantAccessToken({
        token,refreshToken,deviceInfo:Config.getDeviceInfo()
      });

      if ( newRefreshToken ) { 
        await SecureDataStorage.Instance().set('refreshToken',newRefreshToken);
      }

      const tokenToStore = newToken ? newToken : token;

      this.apiService.setToken(tokenToStore);
      this.socketService.setNewToken(tokenToStore);
      
      await SecureDataStorage.Instance().set('token',tokenToStore);
    } catch(e) {
      return false;
    }

    return true;
  }

  public startRefreshing():void {
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