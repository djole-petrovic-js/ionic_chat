import { Device } from 'ionic-native';
import { Storage } from '@ionic/storage';

export class Config {
  private static _config = {
    API_URL:'http://localhost:3000/'
    // API_URL:'http://104.248.25.211/',
  }

  private static _defaultInfo = {
    pin_login_enabled:0
  };

  public static async updateInfo(key,value) {
    const storage = new Storage();
    const data = await storage.get('userInfo');

    data[key] = value;

    return await new Storage().set('userInfo',data);
  }

  public static async storeInfo(data) {
    return await new Storage().set('userInfo',data);
  }

  public static async getInfo() {
    const info = await new Storage().get('userInfo');;
    return info || Config._defaultInfo;
  }

  public static getConfig(param:string):any {
    return Config._config[param];
  }

  public static getAllConfig() {
    return Config._config;
  }

  public static getDeviceInfo() {
    return {
      uuid:Device.uuid,
      serial:Device.serial,
      manufacturer:Device.manufacturer
    };
  }
}