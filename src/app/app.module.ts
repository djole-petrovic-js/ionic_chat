import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { IonicStorageModule } from '@ionic/storage';

import { ChatMain } from '../pages/chat-main/chat-main';
import { LogIn } from '../pages/login/login';
import { Logout } from '../pages/logout/logout';
import { Register } from '../pages/register/register';
import { Search } from '../pages/search/search';
import { Friends } from '../pages/friends/friends';
import { ChatMessages } from '../pages/chatmessages/chatmessages';

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
    Friends,
    Logout,
    Search,
    ChatMessages
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    LogIn,
    Register,
    ChatMain,
    Friends,
    Logout,
    Search,
    ChatMessages
  ],
  providers: [
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
