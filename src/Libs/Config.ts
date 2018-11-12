import { Device } from 'ionic-native';
import { SecureDataStorage } from '../Libs/SecureDataStorage';

export class Config {
  private static _config = {
    // API_URL:'http://192.168.0.104:3000/',
    API_URL:'https://nohistorychat.com/',
    ENV:'production',
    // use secure storage, instead of local storage
    IS_PRODUCTION:true,
    // use diferent name for storage if developing
    USE_PRODUCTION_STORAGE:false,
    // use dummy data for device information if developing
    USE_REAL_DEVICE_INFO:true
  }

  private static _defaultInfo = {
    pin_login_enabled:0
  };

  public static async updateInfo(key,value) {
    const data = await SecureDataStorage.Instance().get('userInfo');

    data[key] = value;

    return await SecureDataStorage.Instance().set('userInfo',data);
  }

  public static async storeInfo(data) {
    return await SecureDataStorage.Instance().set('userInfo',data);
  }

  public static async getInfo() {
    const info = await SecureDataStorage.Instance().get('userInfo');

    const output = {
      info:info || Config._defaultInfo,
      default:!info
    };

    return output;
  }

  public static getConfig(param:string):any {
    return Config._config[param];
  }

  public static getAllConfig() {
    return Config._config;
  }

  public static checkIfDeviceInfoAvailable():boolean {
    const deviceInfo = Config.getDeviceInfo();

    return (
      deviceInfo.uuid && 
      deviceInfo.serial &&
      deviceInfo.manufacturer &&
      deviceInfo.manufacturer !== "unknown" &&
      deviceInfo.serial !== "unknown"
    );
  }

  public static getDeviceInfo() {
    if ( !Config.getAllConfig().USE_REAL_DEVICE_INFO ) {
      return {
        uuid:'abc123',
        serial:'qwer1234',
        manufacturer:'samsung'
      }
    }

    return {
      uuid:Device.uuid,
      serial:Device.serial,
      manufacturer:Device.manufacturer
    };
  }
}