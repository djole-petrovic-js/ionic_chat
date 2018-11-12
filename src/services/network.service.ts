import { Injectable } from '@angular/core';
import { Config } from '../Libs/Config';
import { Network } from 'ionic-native';
import { APIService } from './api.service';
import { Platform } from 'ionic-angular';

@Injectable()
export class NetworkService {
  constructor(
    private apiService:APIService,
    private platform:Platform
  ) { }

  public hasInternetConnection():boolean {
    if ( !Config.getConfig('IS_PRODUCTION') ) return true;

    if ( Network.type === 'unknown' || Network.type === 'none' || Network.type == undefined ) {
      return false;
    } else {
      return true;
    }
  }

  public async connectedViaWiFi():Promise<boolean> {
    if ( !Config.getConfig('IS_PRODUCTION') ) return true;

    await this.platform.ready();

    if ( Network.type === 'unknown' ) return false;

    return Network.type === 'wifi';
  }

  public async heartbeat():Promise<boolean> {
    try {
      await this.platform.ready();

      if ( this.hasInternetConnection() ) {
        return true;
      }
    } catch(e) { }

    try {
      await this.apiService.heartbeat();

      return true;
    } catch(e) {
      return false;
    }
  }
}