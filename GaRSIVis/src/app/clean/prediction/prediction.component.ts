import { Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { D3, D3Service, Selection } from 'd3-ng2-service';

import { Chunk, PredictionResult } from '../interfaces';
import { ReadingService } from '../reading.service';

@Component({
  selector: 'gv-prediction',
  templateUrl: './prediction.component.html',
  styleUrls: ['./prediction.component.scss'],
})
export class PredictionComponent implements OnInit {
  /** Session name. */
  @Input() public sessionName: string;

  /** An element reference to the svg to be used by d3. */
  @ViewChild('svg') private svg: ElementRef;

  public chunks: Chunk[];
  public predictionResult: PredictionResult;
  public chunksLoaded: boolean;
  public predictionLoaded: boolean;

  /** Private, local reference to the d3 global. */
  private d3: D3;

  /**
   * Create a new ReadingComponent.
   * Initialize all lists as empty to avoid "null-pointers".
   * @param readingService Service to fetch data files
   * @param d3Service Service to get a reference to d3
   */
  constructor(
    private readingService: ReadingService,
    d3Service: D3Service,
  ) {
    this.chunksLoaded = false;
    this.predictionLoaded = false;
    this.d3 = d3Service.getD3();
  }

  /**
   * Initialize the component.
   * Fetch relevant data and trigger the rendering.
   */
  public ngOnInit(): void {
    this.loadChunks();
    this.loadPrediction();
    this.readingService.getChunkUpdates(this.sessionName).subscribe((valid: boolean) => {
      if (valid) {
        this.loadChunks();
      } else {
        this.chunksLoaded = false;
      }
    });
    this.readingService.getPredictionUpdates(this.sessionName).subscribe((valid: boolean) => {
      if (valid) {
        this.loadPrediction();
      } else {
        this.predictionLoaded = false;
      }
    });
  }

  private loadChunks(): void {
    this.readingService.queryChunks(this.sessionName).subscribe((chunks: Chunk[]) => {
      this.chunks = chunks;
      this.chunksLoaded = true;
      this.renderChunks();
      this.renderPrediction();
    });
  }

  private loadPrediction(): void {
    this.readingService.queryPredictions(this.sessionName).subscribe((predictionResult: PredictionResult) => {
      this.predictionResult = predictionResult;
      this.predictionLoaded = true;
      this.renderPrediction();
    });
  }

  /**
   * Render the Sparklines with the fetched data.
   */
  private renderChunks(): void {
    // Select the SVG element defined in the HTML template
    const svg: Selection<SVGElement, null, HTMLElement, null> = this.d3.select<SVGElement, null>(this.svg.nativeElement);

    // Get the current width of the parent of the SVG
    const { width } = this.svg.nativeElement.parentNode.getBoundingClientRect();

    const x = this.d3.scaleLinear().domain([0, this.chunks.length]).range([0, width]);

    const y = this.d3.scaleLinear()
      .domain([0, this.d3.max(this.chunks, (d) => d.fixations.count)])
      .range([40, 0]);
    const line = this.d3.line<number>()
      .curve(this.d3.curveStepAfter)
      .x(function (d, i) {
        return x(i);
      })
      .y(function (d) {
        return y(d);
      });

    svg.select('.fixation.count .line')
      .attr('d', line(this.chunks.map((d) => d.fixations.count)));

    [
      ['fixations', 'duration'],
      ['saccades', 'duration'],
      ['saccades', 'length'],
      ['saccades', 'angle'],
    ].forEach((tuple) => {
      const minAvg = this.d3.min(this.chunks, (d) => d[tuple[0]][tuple[1]].avg);
      const minMin = this.d3.min(this.chunks, (d) => d[tuple[0]][tuple[1]].min);
      const minMax = this.d3.min(this.chunks, (d) => d[tuple[0]][tuple[1]].max);

      const maxAvg = this.d3.max(this.chunks, (d) => d[tuple[0]][tuple[1]].avg);
      const maxMin = this.d3.max(this.chunks, (d) => d[tuple[0]][tuple[1]].min);
      const maxMax = this.d3.max(this.chunks, (d) => d[tuple[0]][tuple[1]].max);

      const yScale = this.d3.scaleLinear()
        .domain([
          Math.min(minAvg, minMin, minMax, 0),
          Math.max(maxAvg, maxMin, maxMax)
        ])
        .range([40, 0]);
      const lineGen = this.d3.line<number>()
        .curve(this.d3.curveStepAfter)
        .x(function (d, i) {
          return x(i);
        })
        .y(function (d) {
          return yScale(d);
        });
      const areaGen = this.d3.area<Chunk>()
        .curve(this.d3.curveStepAfter)
        .x(function (d, i) {
          return x(i);
        })
        .y(function (d) {
          return yScale(d[tuple[0]][tuple[1]].min);
        })
        .y1(function (d) {
          return yScale(d[tuple[0]][tuple[1]].max);
        });

      svg.select(`.${tuple[0]}.${tuple[1]} .line`)
        .attr('d', lineGen(this.chunks.map((d) => d[tuple[0]][tuple[1]].avg)));
      svg.select(`.${tuple[0]}.${tuple[1]} .extent`)
        .attr('d', areaGen(this.chunks));
    });
  }

  private renderPrediction(): void {
    if (!this.predictionResult || !this.chunks) {
      return;
    }

    const svg: Selection<SVGElement, null, HTMLElement, null> = this.d3.select<SVGElement, null>(this.svg.nativeElement);
    const { width } = this.svg.nativeElement.parentNode.getBoundingClientRect();

    const x = this.d3.scaleLinear()
      .domain([0, this.predictionResult.prediction.length])
      .range([0, width]);

    const nl = 'M0,130' + this.predictionResult.prediction.map((prediction, i) => {
      const pathSegment = prediction === 0 ? 'L' : 'M';
      return pathSegment + x(i + 1) + ',130';
    }).join('');
    const il = 'M0,130' + this.predictionResult.prediction.map((prediction, i) => {
      const pathSegment = prediction === 1 ? 'L' : 'M';
      return pathSegment + x(i + 1) + ',130';
    }).join('');
    const wl = 'M0,5' + this.predictionResult.prediction.map((prediction, i) => {
      let correct = prediction && this.chunks[i].interruption;
      correct = correct || (!prediction && !this.chunks[i].interruption);
      const pathSegment = correct ? 'M' : 'L';
      return pathSegment + x(i + 1) + ',5';
    }).join('');

    svg.select('.prediction.normal')
      .attr('d', nl);
    svg.select('.prediction.interruption')
      .attr('d', il);
    svg.select('.prediction.incorrect')
      .attr('d', wl);
  }
}
