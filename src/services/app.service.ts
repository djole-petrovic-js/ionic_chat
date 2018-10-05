import { App, ViewController,Platform } from 'ionic-angular';
import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { NetworkService } from './network.service';

@Injectable()
export class AppService {
  private _appCloseTimeout;
  // 45 minutes
  private _closingTimeMS = 1000 * 60 * 45;

  constructor(
    private app:App,
    private platform:Platform,
    private apiService:APIService,
    private networkService:NetworkService
  ) { }

  public startClosingTimeout() {
    this._appCloseTimeout = setTimeout(async() => {
      const isConnected = await this.networkService.heartbeat();

      if ( isConnected ) {
        await this.apiService.changeLoginStatus({ status:0 });
      }

      this.platform.exitApp();
    },this._closingTimeMS);
  }
  
  public stopClosingTimeout() {
    clearTimeout(this._appCloseTimeout);
  }

  public getActivePage():ViewController {
    return this.app.getActiveNavs()[0].getActive();
  }
}