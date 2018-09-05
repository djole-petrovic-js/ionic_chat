import { Injectable } from '@angular/core';
import { Http , Headers } from '@angular/http';
import { Storage } from '@ionic/storage';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { Config } from '../Libs/Config';

@Injectable()
export class AuthenticationService {
  private token = null;
  private mainUrl:string = Config.getConfig('API_URL');
  private logInURL:string = this.mainUrl + 'api/login';
  private logOutURL:string = this.mainUrl + 'api/login/logout';
  private registerURL:string = this.mainUrl + 'api/register';
  private checkEmailUsernameURL:string = this.mainUrl + 'api/register/checkemailusername';
  private resendConfirmationEmailURL:string = this.mainUrl + 'api/register/resend_confirmation_email';

  constructor(private http:Http,private storage:Storage) {}

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

  public storeToken(token):void {
    this.token = token;
    this.storage.set('token',token);
  }

  public async logOut() {
    try {
      const token = await this.storage.get('token');
      const headers = this._headers();

      await Promise.all([
        this.storage.remove('token'),
        this.storage.remove('refreshToken')
      ]);

      headers.append('Authorization','JWT ' + token);

      await this._execute(this.logOutURL,{ },headers).toPromise();
    } catch(e) { }
  }
}