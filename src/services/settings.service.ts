import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import { Config } from '../Libs/Config';
import { Events } from 'ionic-angular';

@Injectable()
export class SettingsService {
  private settings;
  private shouldDisplay:boolean = false;
  private settingsName:string = 'settings';

  constructor(
    private apiService:APIService,
    private events:Events
  ){
    this.events.subscribe('user:logout',() => {
      this.shouldDisplay = false;
      this.settings = null;
    });
  }

  public toggleMainLoadingScreen() {
    this.shouldDisplay = !this.shouldDisplay;
  }

  public shouldDisplayMainLoadingScreen():boolean {
    return this.shouldDisplay;
  } 

  public areSettingsLoaded():boolean {
    return !!this.settings;
  }

  public async setSetting(key:string,value:any) {
    if ( this.settings ) {
      this.settings[key] = value;

      await SecureDataStorage.Instance().set(this.settingsName,this.settings); 
    }
  }

  public async fetchSettings() {
    try {
      if ( this.settings ) {
        return this.settings;
      }

      const settingsFromStorage = await SecureDataStorage.Instance().get(this.settingsName);

      if ( settingsFromStorage ) {
        this.settings = settingsFromStorage;

        return this.settings;
      }

      const settings = await this.apiService.fetchUserInfo();

      await SecureDataStorage.Instance().set(this.settingsName,settings);

      this.settings = settings;

      await Config.storeInfo({ pin_login_enabled:settings.pin_login_enabled });

      return settings;
    } catch(e) {
      throw e;
    }
  }
}