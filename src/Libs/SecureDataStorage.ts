import { SecureStorage } from '@ionic-native/secure-storage';
import { Storage } from '@ionic/storage';
import { Platform } from 'ionic-angular';
import { ServiceLocator } from '../Libs/Injector';
import { Config } from '../Libs/Config';

export class SecureDataStorage {
  private static _instance:SecureDataStorage;
  private _storageName:string = Config.getConfig('USE_PRODUCTION_STORAGE') ? 'tokensStorage' : 'dev_tokensStorage';
  private platform:Platform;
  private secureStorage:SecureStorage;
  private storage:Storage

  public static Instance() {
    if ( !SecureDataStorage._instance ) {
      SecureDataStorage._instance = new SecureDataStorage();
    }

    return SecureDataStorage._instance;
  }

  constructor() {
    this.platform = ServiceLocator.injector.get(Platform);
    this.secureStorage = ServiceLocator.injector.get(SecureStorage);
    this.storage = ServiceLocator.injector.get(Storage);
  }

  public async checkIfSSAvailable() {
    try {
      await this.platform.ready();

      if ( Config.getConfig('IS_PRODUCTION') ) {
        await this.secureStorage.create(this._storageName)
      }

      return true;
    } catch(e) {
      return false;
    }
  }

  public async initStorage() {
    await this._init();
  }

  private async _init() {
    await this.platform.ready();

    if ( Config.getConfig('IS_PRODUCTION') ) {
      return await this.secureStorage.create(this._storageName);
    } else {
      return this.storage;
    }
  }

  public async get(key:string) {
    try {
      const storage = await this._init();
      let value = await storage.get(key);

      try { value = JSON.parse(value) } catch(e) { }

      return value;
    } catch(e) {
      return null;
    }
  }

  public async set(key:string,value:any) {
    try {
      if ( typeof value === 'object' ) {
        value = JSON.stringify(value);
      }
  
      if ( Config.getConfig('IS_PRODUCTION') ) {
        const storage = await this.secureStorage.create(this._storageName);
  
        return await storage.set(key,value);
      } else {
        return await this.storage.set(key,value);
      }
    } catch(e) {
      throw e;
    }
  }

  public async remove(key) {
    try {
      const storage = await this._init();

      await storage.remove(key);
    } catch(e) {
      throw e;
    }
  }

  public async clear() {
    try {
      const storage = await this._init();

      await storage.clear();
    } catch(e) {
      throw e;
    }
  }
}