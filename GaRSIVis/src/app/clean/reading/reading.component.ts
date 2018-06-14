import { Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { D3, D3Service, Selection } from 'd3-ng2-service';

import { IgnoredTimeSegment, InterruptionTimePoint, PreprocessedSession } from '../interfaces';
import { ReadingService } from '../reading.service';

@Component({
  selector: 'gv-reading',
  templateUrl: './reading.component.html',
  styleUrls: ['./reading.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ReadingComponent implements OnInit {
  /** Session name. */
  @Input() public sessionName: string;

  /** An element reference to the svg to be used by d3. */
  @ViewChild('svg') private svg: ElementRef;

  /** List of fixation counts per second. */
  public fixationCounts: number[];
  /** List of ignored/stripped segments. */
  public ignored: IgnoredTimeSegment[];
  /** List of interruptions time points. */
  public interruptions: InterruptionTimePoint[];

  public readingLoaded: boolean;

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
    this.readingLoaded = false;
    this.fixationCounts = [];
    this.ignored = [];
    this.interruptions = [];
    this.d3 = d3Service.getD3();
  }

  /**
   * Initialize the component.
   * Fetch relevant data and trigger the rendering.
   */
  public ngOnInit(): void {
    this.loadSession();
    this.readingService.getAnnotationUpdates(this.sessionName).subscribe((valid) => {
      if (valid) {
        this.loadSession();
      } else {
        this.readingLoaded = false;
      }
    });
  }

  private loadSession(): void {
    this.readingService.querySession(this.sessionName).subscribe((session: PreprocessedSession) => {
      this.readingLoaded = true;
      this.fixationCounts = session.counts;
      this.ignored = session.ignored;
      this.interruptions = session.interruptions;
      this.render();
    });
  }

  /**
   * Render the Sparklines with the fetched data.
   */
  private render(): void {
    // Select the SVG element defined in the HTML template
    const svg: Selection<Element, null, HTMLElement, null> = this.d3.select<Element, null>(this.svg.nativeElement);

    // Get the current width and height of the SVG
    const { width, height } = this.svg.nativeElement.parentNode.getBoundingClientRect();
    // Margin above and below the sparkline
    const margin = 6;
    // Height of the sparkline
    const lineHeight = height - 2 * margin;
    // Width of an interruption mark
    const interruptionBarWidth = 5;

    // X scale will fit values from 0-10 within pixels 0-100
    // 0,10 -> counts length 0,30 -> width
    const x = this.d3.scaleLinear().domain([0, this.fixationCounts.length]).range([0, width]);
    // Y scale will fit values from 0-10 within pixels 0-100
    const y = this.d3.scaleLinear().domain([0, this.d3.max(this.fixationCounts)]).range([lineHeight + margin, margin]);

    svg.append('rect')
      .classed('normal', true)
      .attr('width', width)
      .attr('y', margin)
      .attr('height', lineHeight);

    for (let j = 0; j < this.interruptions.length; j++) {
      const startPx = x(this.interruptions[j].timestamp);
      svg.append('rect')
        .classed('interrupt', true)
        .attr('x', startPx - interruptionBarWidth)
        .attr('width', interruptionBarWidth)
        .attr('y', margin)
        .attr('height', lineHeight);
    }

    for (let i = 0; i < this.ignored.length; i++) {
      const startPx = x(this.ignored[i].start);
      const widthPx = x(this.ignored[i].end - this.ignored[i].start);
      svg.append('rect')
        .classed('ignored', true)
        .attr('x', startPx)
        .attr('width', widthPx)
        .attr('y', margin)
        .attr('height', lineHeight);
    }

    const line = this.d3.line<number>()
      .x(function (d, i) {
        return x(i);
      })
      .y(function (d) {
        return y(d);
      });

    svg.append('svg:path')
      .classed('reading-fixation-counts', true)
      .attr('d', line(this.fixationCounts));
  }
}
