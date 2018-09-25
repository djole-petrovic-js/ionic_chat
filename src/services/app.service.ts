import { App, ViewController } from 'ionic-angular';
import { Injectable } from '@angular/core';

@Injectable()
export class AppService {
  private app:App;

  constructor(
    private application:App,
  ) {
    this.app = application;
  }

  public getActivePage():ViewController {
    return this.app.getActiveNavs()[0].getActive();
  }
}