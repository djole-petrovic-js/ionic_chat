import { NgModule, ErrorHandler, ApplicationRef } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { IonicStorageModule } from '@ionic/storage';
import { Device,Network } from 'ionic-native';
import { SecureStorage } from '@ionic-native/secure-storage';
import { Injector } from "@angular/core";
import { BackgroundMode } from 'ionic-native';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpModule } from '@angular/http'
import { PincodeInputModule } from  'ionic2-pincode-input';
import { ServiceLocator } from '../Libs/Injector';

import { ChatMain } from '../pages/chat-main/chat-main';
import { LogIn } from '../pages/login/login';
import { Logout } from '../pages/logout/logout';
import { Register } from '../pages/register/register';
import { Search } from '../pages/search/search';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { Settings } from '../pages/settings/settings';
import { About } from '../pages/about/about';

import { AuthenticationService } from '../services/authentication.service';
import { APIService } from '../services/api.service';
import { NotificationsService } from '../services/notifications.service';
import { MessagesService } from '../services/messages.service';
import { SocketService } from '../services/socket.service';
import { FriendsService } from '../services/friends.service';
import { SettingsService } from '../services/settings.service';
import { TokenService } from '../services/token.service';
import { ErrorResolverService } from '../services/errorResolver.service';
import { NetworkService } from '../services/network.service';
      
@NgModule({
  declarations: [
    MyApp,
    LogIn,
    Register,
    ChatMain,
    Logout,
    Search,
    ChatMessages,
    Settings,
    About
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpModule,
    PincodeInputModule,
    IonicStorageModule.forRoot(),
    IonicModule.forRoot(MyApp,{
      scrollAssist: false, 
      autoFocusAssist: false
    }),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    LogIn,
    Register,
    ChatMain,
    Logout,
    Search,
    ChatMessages,
    Settings,
    About
  ],
  providers: [
    BackgroundMode,
    SecureStorage,
    Device,
    Network,
    ErrorResolverService,
    TokenService,
    FriendsService,
    SocketService,
    AuthenticationService,
    APIService,
    NotificationsService,
    MessagesService,
    SettingsService,
    NetworkService,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {
  constructor(
    private injector:Injector,
    private app:ApplicationRef
  ) {
    ServiceLocator.injector = this.injector;

    setInterval(() => { app.tick(); }, 500);
  } 
}
