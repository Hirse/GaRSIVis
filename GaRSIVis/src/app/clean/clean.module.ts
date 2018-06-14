import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatButtonModule,
  MatCardModule,
  MatDialogModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSnackBarModule,
  MatToolbarModule,
  MatTooltipModule
} from '@angular/material';
import { RouterModule } from '@angular/router';

import { ChunkSizeComponent } from './chunk-size/chunk-size.component';
import { ListViewComponent } from './list-view/list-view.component';
import { PredictionListComponent } from './prediction-list/prediction-list.component';
import { PredictionNumbersComponent } from './prediction-numbers/prediction-numbers.component';
import { PredictionComponent } from './prediction/prediction.component';
import { ReadingComponent } from './reading/reading.component';
import { SessionDetailComponent } from './session-detail/session-detail.component';

import { ReadingService } from './reading.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
    RouterModule,
  ],
  entryComponents: [
    ChunkSizeComponent,
  ],
  declarations: [
    ListViewComponent,
    ReadingComponent,
    SessionDetailComponent,
    PredictionListComponent,
    PredictionComponent,
    ChunkSizeComponent,
    PredictionNumbersComponent,
  ],
  providers: [
    ReadingService,
  ]
})
export class CleanModule { }
