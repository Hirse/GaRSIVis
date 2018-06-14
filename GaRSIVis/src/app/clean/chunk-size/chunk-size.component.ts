import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { PredictionListComponent } from '../prediction-list/prediction-list.component';

@Component({
  selector: 'gv-chunk-size',
  templateUrl: './chunk-size.component.html',
  styleUrls: ['./chunk-size.component.scss']
})
export class ChunkSizeComponent {
  constructor(
    public dialogRef: MatDialogRef<PredictionListComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  public onNoClick(): void {
    this.dialogRef.close();
  }
}
