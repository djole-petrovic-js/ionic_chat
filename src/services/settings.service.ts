import { Injectable } from '@angular/core';
import { APIService } from './api.service';
import { SecureDataStorage } from '../Libs/SecureDataStorage';
import { Config } from '../Libs/Config';
import { Events } from 'ionic-angular';

@Injectable()
export class SettingsService {
  private settings;
  private shouldConfigureSubscriptionsAndBackground:boolean = false;
  private isPinUnlockSet:boolean = null;
  private PINUnlockDevice:string = null;
  private settingsName:string = 'settings';
  private pinUnlockDeviceName:string = 'pin:unlock_device';
  private shouldLoadFromServer:boolean = true;

  constructor(
    private apiService:APIService,
    private events:Events
  ){
    this.events.subscribe('user:logout',() => {
      this.settings = null;
    });
  }

  public async setPINUnlockDevice(pin:string):Promise<void> {
    await SecureDataStorage.Instance().set(this.pinUnlockDeviceName,pin);
    this.isPinUnlockSet = true;
    this.PINUnlockDevice = pin;
  }

  public async deletePINUnlockDevice():Promise<void> {
    this.isPinUnlockSet = false;
    this.PINUnlockDevice = null;
    await SecureDataStorage.Instance().remove(this.pinUnlockDeviceName);
  }

  public isPINUnlockDeviceSetSync():boolean {
    return this.isPinUnlockSet;
  }

  public async isPINUnlockDeviceSet():Promise<boolean> {
    if ( this.PINUnlockDevice ) return true;

    return !!( await this.getPINUnlockDevice() );
  }

  public getPINUnlockDeviceSync() {
    return this.PINUnlockDevice;
  }

  public async getPINUnlockDevice():Promise<string> {
    const pin:string = await SecureDataStorage.Instance().get(this.pinUnlockDeviceName);

    return pin;
  }

  public areSettingsLoaded():boolean {
    if ( !this.shouldConfigureSubscriptionsAndBackground ) {
      this.shouldConfigureSubscriptionsAndBackground = true;

      return false;
    }


    return this.shouldConfigureSubscriptionsAndBackground;
  }

  public async setSetting(key:string,value:any) {
    if ( this.settings ) {
      this.settings[key] = value;

      await SecureDataStorage.Instance().set(this.settingsName,this.settings); 
    }
  }

  public setSettings(settings) {
    this.settings = settings;
  }

  public async fetchSettings() {
    try {
      if ( this.isPinUnlockSet === null) {
        [this.isPinUnlockSet,this.PINUnlockDevice] = await Promise.all([
          this.isPINUnlockDeviceSet(),this.getPINUnlockDevice()
        ]);
      }

      if ( this.settings ) {
        return this.settings;
      }

      if ( !this.shouldLoadFromServer ) {
        const settingsFromStorage = await SecureDataStorage.Instance().get(this.settingsName);

        if ( settingsFromStorage ) {
          this.settings = settingsFromStorage;

          return this.settings;
        }
      }

      const settings = await this.apiService.fetchUserInfo();

      await SecureDataStorage.Instance().set(this.settingsName,settings);

      this.shouldLoadFromServer = false;
      this.settings = settings;

      await Config.storeInfo({ pin_login_enabled:settings.pin_login_enabled });

      return settings;
    } catch(e) {
      throw e;
    }
  }
}