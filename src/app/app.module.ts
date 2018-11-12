import { NgModule, ErrorHandler } from '@angular/core';
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
import { Keyboard } from '@ionic-native/keyboard';
import { FCM } from '@ionic-native/fcm';
import { Vibration } from '@ionic-native/vibration';
import { HTTP } from '@ionic-native/http';
import { LockScreenModule, LockScreenComponent } from 'ionic-simple-lockscreen';

import { ChatMain } from '../pages/chat-main/chat-main';
import { LogIn } from '../pages/login/login';
import { Logout } from '../pages/logout/logout';
import { Register } from '../pages/register/register';
import { Search } from '../pages/search/search';
import { ChatMessages } from '../pages/chatmessages/chatmessages';
import { Settings } from '../pages/settings/settings';
import { About } from '../pages/about/about';

import { AppService } from '../services/app.service';
import { AuthenticationService } from '../services/authentication.service';
import { APIService } from '../services/api.service';
import { NotificationsService } from '../services/notifications.service';
import { SocketService } from '../services/socket.service';
import { MessagesService } from '../services/messages.service';
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
    About,
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
    LockScreenModule
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
    About,
    LockScreenComponent
  ],
  providers: [
    HTTP,
    Vibration,
    FCM,
    AppService,
    Keyboard,
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
    { provide: ErrorHandler, useClass: IonicErrorHandler }
  ]
})
export class AppModule {
  constructor (
    private injector:Injector,
  ) {
    ServiceLocator.injector = this.injector;
  } 
}