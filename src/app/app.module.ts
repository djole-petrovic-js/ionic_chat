import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { IonicStorageModule } from '@ionic/storage';
import { Device } from 'ionic-native';

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
    IonicModule.forRoot(MyApp,{
      scrollAssist: false, 
      autoFocusAssist: false
    }),
    IonicStorageModule.forRoot(),
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
    Device,
    FriendsService,
    SocketService,
    AuthenticationService,
    APIService,
    NotificationsService,
    MessagesService,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
