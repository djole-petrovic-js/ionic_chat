import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import * as moment from 'moment';
import { Events } from 'ionic-angular';

@Injectable()
export class TokenService {
  private _interval;
  private _intervalSeconds:number = 1000 * 60 * 10;
  private _refreshingStarted:boolean = false;
  private _cachedRefreshToken:string;
  private _cachedToken:string;
  private _cashing:boolean = false;
  private _lastRefreshed:string;

  constructor(
    private apiService:APIService,
    private events:Events
  ) {
    this.events.subscribe('user:logout',async() => {
      this.clearTokens();
    });
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

  public async setFCMToken(token:string) {
    try {
      const response = await this.apiService.setFCMToken({ token });

      return response;
    } catch(e) {
      throw e;
    }
  }

  public async clearTokens():Promise<void> {
    this._cachedToken = null;
    this._cachedRefreshToken = null;
    this._cashing = false;
    this._lastRefreshed = '';

    await Promise.all([
      SecureDataStorage.Instance().remove('token'),
      SecureDataStorage.Instance().remove('refreshToken'),
    ]);
  }

  public async getActiveToken():Promise<string> {
    const token:string = this._cachedToken
      ? this._cachedToken
      : await SecureDataStorage.Instance().get('token');

    return token;
  }

  public async getTokens():Promise<string[]> {
    if ( this._cachedToken && this._cachedRefreshToken ) {
      return [this._cachedToken,this._cachedRefreshToken];
    }

    const tokens:string[] = await Promise.all([
      SecureDataStorage.Instance().get('token'),
      SecureDataStorage.Instance().get('refreshToken')
    ]);

    return tokens;
  }

  public startCashing():void {
    this._cashing = true;
  }

  public async checkLoginStatus():Promise<boolean> {
    try {
      if ( this._cashing && this._lastRefreshed ) {
        const diff = moment().diff(moment(this._lastRefreshed),'minutes');

        if ( diff < 10 ) return true;

        if ( diff < 25 ) {
          await this._getAndStoreToken();
          this._lastRefreshed = moment().toISOString();

          return true;
        }
      }

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

      const tokenToStore:string = newToken ? newToken : token;

      this.apiService.setToken(tokenToStore);
      this._cachedToken = tokenToStore;
      this._lastRefreshed = moment().toISOString();
    } catch(e) {
      return false;
    }

    return true;
  }

  private async _getAndStoreToken():Promise<void> {
    const response = await this.apiService.refreshToken();

    this.apiService.setToken(response.token);
    this._cachedToken = response.token;

    if ( this._cashing ) {
      this._lastRefreshed = moment().toISOString();
    }
  }
}