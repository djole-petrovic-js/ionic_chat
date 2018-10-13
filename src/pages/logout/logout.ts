import { Component } from '@angular/core';
import { Events } from 'ionic-angular';
import { AuthenticationService } from '../../services/authentication.service';
import { LoadingController } from 'ionic-angular';

@Component({
  selector: 'page-logout',
  templateUrl: 'logout.html'
})
export class Logout {
  constructor(
    private events:Events,
    private authenticationService:AuthenticationService,
    private loadingController:LoadingController
  ) { }  

  async ionViewWillEnter() {
    const loading = this.loadingController.create({
      spinner:'bubbles', content:'Loging out...'
    });

    await loading.present();
    await this.authenticationService.logOut();

    loading.dismiss();
    loading.onDidDismiss(() => this.events.publish('user:logout'));
  }
}
