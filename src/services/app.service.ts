import { App, ViewController,Platform } from 'ionic-angular';
import { Injectable } from '@angular/core';
import { NetworkService } from './network.service';
import { HTTP, HTTPResponse } from '@ionic-native/http';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import * as moment from 'moment';
import { TokenService } from './token.service';
import { FriendsService } from './friends.service';
import { NotificationsService } from './notifications.service';
import { SettingsService } from './settings.service';
import { APIService } from './api.service';

@Injectable()
export class AppService {
  private offlineURL:string = Config.getConfig('API_URL') + 'api/login/change_login_status';
  private heartbeatURL:string = Config.getConfig('API_URL') + 'api/login/heartbeat';
  private refreshTokenURL:string = Config.getConfig('API_URL') + 'api/login/grant_access_token';
  private isTimeoutCalled:boolean = false;
  private lastSentToBackground:string = null;
  private _BackgroundFetch = (<any>window).BackgroundFetch;
  private shouldAskForPINUnlock:boolean = null;

  constructor(
    private app:App,
    private platform:Platform,
    private networkService:NetworkService,
    private http:HTTP,
    private tokenService:TokenService,
    private friendsService:FriendsService,
    private notificationsService:NotificationsService,
    private settingsService:SettingsService,
    private apiService:APIService,
  ) {
    this.fetchCB = this.fetchCB.bind(this);
    this.errorCB = this.errorCB.bind(this);
  }

  public shoudAskForPIN():boolean {
    return this.shouldAskForPINUnlock;
  }

  public setShouldAskForPIN(value:boolean):void {
    this.shouldAskForPINUnlock = value;
  }

  public async loadData() {
    const isOnWifi = await this.networkService.connectedViaWiFi();

    if ( !isOnWifi ) {
      let bundledData = await this.apiService.bundledData();

      this.friendsService.setFriends(bundledData.friends);
      this.friendsService.setPendingFriends(bundledData.pendingRequests);
      this.notificationsService.setNotifications(bundledData.notifications);
      this.settingsService.setSettings(bundledData.settings);

      bundledData = null;
    }

    await Promise.all([
      this.friendsService.getFriends(),
      this.notificationsService.getNotifications(),
      this.friendsService.getPendingRequets(),
      this.settingsService.fetchSettings()
    ]);
  }

  private async changeOnlineStatusAndExit() {
    let isConnected;

    try {
      const hasInternet = this.networkService.hasInternetConnection();

      if ( hasInternet ) {
        isConnected = true;
      } else {
        await this.http.get(this.heartbeatURL,{},{});

        isConnected = true;
      }
    } catch(e) {
      isConnected = false;
    }

    if ( isConnected ) {
      try {
        const [ token,refreshToken ] = await this.tokenService.getTokens();

        this.http.setDataSerializer('json');

        const response:HTTPResponse = await this.http.post(this.refreshTokenURL,{
          token,
          refreshToken,
          deviceInfo:Config.getDeviceInfo()
        },{
          'Content-Type':'application/json'
        });

        const { token:newToken,refreshToken:newRefreshToken } = JSON.parse(response.data);

        if ( newRefreshToken ) { 
          await SecureDataStorage.Instance().set('refreshToken',newRefreshToken);
        }

        const tokenToSend = newToken ? newToken : token;

        await this.http.post(this.offlineURL,{ status:0 },{
          'Content-Type':'application/json',
          'Authorization':'JWT ' + tokenToSend
        });
      } catch(e) { }
    }

    this._BackgroundFetch.finish();
    this.platform.exitApp();
  }

  private async fetchCB() {
    if ( !this.lastSentToBackground ) {
      return this._BackgroundFetch.finish();
    }

    if ( moment().diff(moment(this.lastSentToBackground),'minutes') >= 120 ) {
      this.changeOnlineStatusAndExit();
    } else {
      this._BackgroundFetch.finish();
    }
  }

  private errorCB() { }

  public startClosingTimeout():void {
    this.lastSentToBackground = moment().toISOString();

    if ( this.isTimeoutCalled ) return;

    this.isTimeoutCalled = true;

    this._BackgroundFetch.configure(this.fetchCB, this.errorCB, {
      minimumFetchInterval: 15,
      stopOnTerminate: true,
      startOnBoot: false,   
      forceReload: false
    });
  }
  
  public stopClosingTimeout():void {
    this.lastSentToBackground = null;
  }

  public getActivePage():ViewController {
    return this.app.getActiveNavs()[0].getActive();
  }
}