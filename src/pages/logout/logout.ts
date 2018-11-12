import { Component } from '@angular/core';
import { Events, AlertController } from 'ionic-angular';
import { LoadingController } from 'ionic-angular';
import { APIService } from '../../services/api.service';
import { TokenService } from '../../services/token.service';
import { SecureDataStorage } from '../../Libs/SecureDataStorage';

@Component({
  selector: 'page-logout',
  templateUrl: 'logout.html'
})
export class Logout {
  constructor(
    private events:Events,
    private apiService:APIService,
    private tokenService:TokenService,
    private loadingController:LoadingController,
    private alertController:AlertController
  ) { }

  async ionViewWillEnter() {
    let loading = this.loadingController.create({
      spinner:'bubbles', content:'Loging out...'
    });

    try {
      await loading.present();
      await this.tokenService.checkLoginStatus();
      await this.apiService.logOut();

      loading.dismiss();
    } catch(e) {
      try { await loading.dismiss(); } catch(e) { }

      this.alertController.create({
        title:'Log Out Error',
        message:'Fatal error occured while trying to log you out. Try to restart your application.',
        buttons:['OK']
      }).present();
    } finally {
      try { await loading.dismiss(); } catch(e) { }
      this.events.publish('user:logout');
    }
  }
}
