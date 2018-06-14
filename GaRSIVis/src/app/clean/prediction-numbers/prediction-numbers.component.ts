import { Component, Input, OnInit } from '@angular/core';

import { PredictionResult } from '../interfaces';
import { ReadingService } from '../reading.service';

@Component({
  selector: 'gv-prediction-numbers',
  templateUrl: './prediction-numbers.component.html',
  styleUrls: ['./prediction-numbers.component.scss']
})
export class PredictionNumbersComponent implements OnInit {
  /** Session name. */
  @Input() public sessionName: string;

  public predictionResultLoaded: boolean;
  public predictionResult: PredictionResult;

  constructor(
    private readingService: ReadingService,
  ) {
    this.predictionResultLoaded = false;
  }

  public ngOnInit(): void {
    this.loadSession();
    this.readingService.getPredictionUpdates(this.sessionName).subscribe((valid: boolean) => {
      if (valid) {
        this.loadSession();
      } else {
        this.predictionResultLoaded = false;
      }
    });
  }

  private loadSession(): void {
    this.readingService.queryPredictions(this.sessionName).subscribe((predictionResult: PredictionResult) => {
      this.predictionResult = predictionResult;
      this.predictionResultLoaded = true;
    });
  }
}
