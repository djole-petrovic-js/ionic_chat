import { Component, ViewChild } from '@angular/core';
import { Nav, Platform , MenuController , Events } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';

import { LogIn } from '../pages/login/login';
import { Logout } from '../pages/logout/logout';
import { Register } from '../pages/register/register';
import { ChatMain } from '../pages/chat-main/chat-main';
import { Search } from '../pages/search/search';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { Settings } from '../pages/settings/settings';
import { About } from '../pages/about/about';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = LogIn;

  pages: Array<{title: string, component: any}>;
  pagesUnathorized;
  pagesAuthorized;
  forAll;

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
      this.pages = [...this.pagesUnathorized,...this.forAll];

      this.openPage({
        component:LogIn
      });
    });

    // pages for all Users
    this.forAll = [
      { title:'About', component:About }
    ]

    // pages for unauthorzied users
    this.pagesUnathorized = [
      { title: 'Log in', component: LogIn },
      { title: 'Register', component: Register },
    ];

    // pages for authorized users
    this.pagesAuthorized = [
      { title: 'Main', component: ChatMain },
      { title: 'Search', component:Search },
      { title: 'Settings', component:Settings },
      { title: 'Log Out', component:Logout },
    ];

    this.pages = [...this.pagesUnathorized,...this.forAll];
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
    if (
      page.component === ChatMain ||
      page.component === LogIn
    ) {
      this.nav.setRoot(page.component);
    } else {
      this.nav.push(page.component);
    }
  }

  changePage(page) {

  }

  chageMenus() {
    this.pages = [...this.pagesAuthorized,...this.forAll];
  }
}
