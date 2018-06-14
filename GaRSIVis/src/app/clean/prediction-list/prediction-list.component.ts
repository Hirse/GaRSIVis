import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';

import { ChunkSizeComponent } from '../chunk-size/chunk-size.component';
import { PredictionSummary } from '../interfaces';
import { ReadingService } from '../reading.service';

@Component({
  templateUrl: './prediction-list.component.html',
  styleUrls: ['./prediction-list.component.scss']
})
export class PredictionListComponent implements OnInit {
  public sessions: string[];
  public predictionSummaryLoaded: boolean;
  public predictionSummary: PredictionSummary;

  public chunkSize: number;

  constructor(
    private readingService: ReadingService,
    public dialog: MatDialog
  ) {}

  public ngOnInit(): void {
    this.readingService.getSessions().subscribe((sessions: string[]) => {
      this.sessions = sessions;
    });
    this.readingService.getPredictionSummaryUpdates().subscribe((valid: boolean) => {
      if (valid) {
        this.loadPredictionSummary();
      } else {
        this.predictionSummaryLoaded = false;
      }
    });
    this.loadPredictionSummary();
  }

  public changeCunkSize(): void {
    const dialogRef: MatDialogRef<ChunkSizeComponent> = this.dialog.open(ChunkSizeComponent, {
      data: {
        chunkSize: this.chunkSize
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result && this.chunkSize !== result) {
        this.chunkSize = result;
        this.readingService.setChunkSize(this.chunkSize);
      }
    });
  }

  private loadPredictionSummary(): void {
    this.readingService.getPredictionSummary().subscribe((predictionSummary: PredictionSummary) => {
      this.predictionSummary = predictionSummary;
      this.chunkSize = predictionSummary.chunk_size;
      this.predictionSummaryLoaded = true;
    });
  }
}
