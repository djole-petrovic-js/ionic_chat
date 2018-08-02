import { Component, ViewChild } from '@angular/core';
import { Nav, Platform , MenuController , Events } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';

import { LogIn } from '../pages/login/login';
import { Logout } from '../pages/logout/logout';
import { Register } from '../pages/register/register';
import { ChatMain } from '../pages/chat-main/chat-main';
import { Friends } from '../pages/friends/friends';
import { Search } from '../pages/search/search';
import { ChatMessages } from '../pages/chatmessages/chatmessages';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = LogIn;

  pages: Array<{title: string, component: any}>;
  pagesAll;
  pagesAuthorized;

  constructor(public platform: Platform, private menu: MenuController,private events:Events) {
    this.initializeApp();

    this.events.subscribe('user:loggedin',() => {
      this.chageMenus();

      this.openPage({
        component:ChatMain
      });
    });

    this.events.subscribe('start:chatting-ready',(data) => {
      this.openPage({
        component:ChatMessages
      });
    });

    this.events.subscribe('user:logout',() => {
      this.pages = this.pagesAll;

      this.openPage({
        component:LogIn
      });
    });

    // used for an example of ngFor and navigation
    this.pagesAll = [
      { title: 'Log in', component: LogIn },
      { title: 'Register', component: Register },
    ];

    this.pagesAuthorized = [
      { title: 'Main', component: ChatMain },
      { title: 'Friends', component:Friends },
      { title: 'Search', component:Search },
      { title: 'Log Out', component:Logout },
    ];

    this.pages = this.pagesAll;
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }

  changePage(page) {

  }

  chageMenus() {
    this.pages = this.pagesAuthorized;
  }
}
