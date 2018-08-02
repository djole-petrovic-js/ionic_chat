import { Injectable } from '@angular/core';
import { Http , Headers } from '@angular/http';
import { Storage } from '@ionic/storage';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

@Injectable()
export class AuthenticationService {
  private token = null;
  private isLoggedInURL:string = 'http://localhost:3000/api/check_user';
  private logInURL:string = 'http://localhost:3000/api/login';
  private registerURL:string = 'http://localhost:3000/api/register';
  private headers;

  constructor(private http:Http,private storage:Storage) {
    this.headers = new Headers();

    this.headers.append('Content-Type','application/json');
  }

  public logIn(options) {
    return this.http.post(this.logInURL,options,{ headers:this.headers })
      .map((res) => res.json())
      .catch((error) => Observable.throw(error.json() || 'Server error'));
  }

  public register(options) {
    return this.http.post(this.registerURL,options,{ headers:this.headers })
      .map((response) => response.json())
      .catch((error) => Observable.throw(error.json() || 'Server error'));
  }

  public storeToken(token):void {
    this.token = token;
    this.storage.set('token',token);
  }

  public logOut():void {
    this.storage.clear();
  }
}