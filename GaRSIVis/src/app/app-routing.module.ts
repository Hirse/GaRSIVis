import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListViewComponent } from './clean/list-view/list-view.component';
import { PredictionListComponent } from './clean/prediction-list/prediction-list.component';
import { SessionDetailComponent } from './clean/session-detail/session-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ListViewComponent
  }, {
    path: 'clean/:session',
    component: SessionDetailComponent
  }, {
    path: 'predict',
    component: PredictionListComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
