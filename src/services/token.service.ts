import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { APIService } from './api.service';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';

@Injectable()
export class TokenService {
  private _interval;
  private _intervalSeconds:number = 1000 * 60 * 10;
  private _refreshingStarted:boolean = false;
  private _cachedRefreshToken:string;
  private _cachedToken:string;

  constructor(
    private apiService:APIService,
    private events:Events
  ) {
    this.events.subscribe('user:logout',() => this.stopRefreshing());
  }

  public async setFCMToken(token:string) {
    try {
      const response = await this.apiService.setFCMToken({ token });

      return response;
    } catch(e) {
      throw e;
    }
  }

  public async getActiveToken():Promise<string> {
    const token = this._cachedToken
      ? this._cachedToken
      : await SecureDataStorage.Instance().get('token');

    return token;
  }

  public async getTokens():Promise<string[]> {
    if ( this._cachedToken && this._cachedRefreshToken ) {
      return [this._cachedToken,this._cachedRefreshToken];
    }

    const tokens = await Promise.all([
      SecureDataStorage.Instance().get('token'),
      SecureDataStorage.Instance().get('refreshToken')
    ]);

    return tokens;
  }

  public async checkLoginStatus():Promise<boolean> {
    try {
      const [ token,refreshToken ] = await this.getTokens();

      if ( !refreshToken || !token ) return false;

      const { token:newToken,refreshToken:newRefreshToken } = await this.apiService.grantAccessToken({
        token,refreshToken,deviceInfo:Config.getDeviceInfo()
      });

      if ( !this._cachedRefreshToken ) {
        this._cachedRefreshToken = refreshToken;
      }

      if ( newRefreshToken ) { 
        await SecureDataStorage.Instance().set('refreshToken',newRefreshToken);
        this._cachedRefreshToken = newRefreshToken;
      }

      const tokenToStore = newToken ? newToken : token;

      this.apiService.setToken(tokenToStore);
      this._cachedToken = tokenToStore;
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
    this._cachedToken = response.token;
  }

  private async _start():Promise<void> {
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
    this._cachedToken = '';
    this._cachedRefreshToken = '';
  }
}