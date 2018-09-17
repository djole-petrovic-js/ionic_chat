import { Injectable } from '@angular/core';
import { Http , Headers } from '@angular/http';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { Config } from '../Libs/Config';
import { SecureDataStorage } from '../Libs/SecureDataStorage';

@Injectable()
export class AuthenticationService {
  private mainUrl:string = Config.getConfig('API_URL');
  private logInURL:string = this.mainUrl + 'api/login';
  private logOutURL:string = this.mainUrl + 'api/login/logout';
  private registerURL:string = this.mainUrl + 'api/register';
  private checkEmailUsernameURL:string = this.mainUrl + 'api/register/checkemailusername';
  private resendConfirmationEmailURL:string = this.mainUrl + 'api/register/resend_confirmation_email';

  constructor(private http:Http) {}

  public logIn(body) {
    return this._execute(this.logInURL,body);
  }

  public register(body) {
    return this._execute(this.registerURL,body);
  }
  
  public checkEmailUsername(body) {
    return this._execute(this.checkEmailUsernameURL,body);
  }
  
  public resendConfirmationEmail(body) {
    return this._execute(this.resendConfirmationEmailURL,body);
  }

  private _execute(url,body,headers = this._headers()) {
    return this.http.post(url,body,{ headers })
      .map((response) => response.json())
      .catch((error) => Observable.throw(error.json() || 'Server error'));
  }

  private _headers() {
    const headers = new Headers();

    headers.append('Content-Type','application/json');

    return headers;
  }

  public async logOut() {
    try {
      const token = await SecureDataStorage.Instance().get('token');
      const headers = this._headers();

      await Promise.all([
        SecureDataStorage.Instance().remove('token'),
        SecureDataStorage.Instance().remove('refreshToken')
      ]);

      headers.append('Authorization','JWT ' + token);

      await this._execute(this.logOutURL,{ },headers).toPromise();
    } catch(e) { }
  }
}