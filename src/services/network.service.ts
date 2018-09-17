import { Injectable } from '@angular/core';
import { Config } from '../Libs/Config';
import { Network } from 'ionic-native';

@Injectable()
export class NetworkService {
  constructor() { }

  public hasInternetConnection() {
    if ( !Config.getConfig('IS_PRODUCTION') ) return true;

    if ( Network.type === "unknown" || Network.type === "none" || Network.type == undefined ) {
      return false;
    } else {
      return true;
    }
  }
}