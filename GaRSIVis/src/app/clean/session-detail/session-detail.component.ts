import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { D3, D3Service, ScaleLinear, Selection } from 'd3-ng2-service';

import { IgnoredTimeSegment, InterruptionTimePoint, PreprocessedSession } from '../interfaces';
import { ReadingService } from '../reading.service';

@Component({
  templateUrl: './session-detail.component.html',
  styleUrls: ['./session-detail.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SessionDetailComponent implements OnInit {
  /** An element reference to the svg to be used by d3. */
  @ViewChild('svg') private svg: ElementRef;

  public sessionName: string;
  /** List of fixation counts per second. */
  public fixationCounts: number[];
  /** List of ignored/stripped segments. */
  public ignored: IgnoredTimeSegment[];
  public userIgnored: IgnoredTimeSegment[];
  /** List of interruptions time points. */
  public interruptions: InterruptionTimePoint[];

  /** Private, local reference to the d3 global. */
  private d3: D3;
  private xScale: ScaleLinear<number, number>;

  constructor(
    private readingService: ReadingService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    d3Service: D3Service,
  ) {
    this.fixationCounts = [];
    this.ignored = [];
    this.userIgnored = [];
    this.interruptions = [];
    this.d3 = d3Service.getD3();
  }

  /**
   * Initialize the component.
   * Fetch relevant data and trigger the rendering once the routing is resolved.
   */
  public ngOnInit(): void {
    this.route.params.subscribe((params: Params) => {
      this.sessionName = params.session;
      this.readingService.querySession(this.sessionName).subscribe((session: PreprocessedSession) => {
        this.fixationCounts = session.counts;
        this.ignored = session.ignored;
        this.interruptions = session.interruptions;
        this.render();
      });
    });
  }

  public onBack(): void {
    this.readingService.setAnnotations(this.sessionName, this.userIgnored);
    this.router.navigate(['/']);
  }

  /**
   * Render the Sparklines with the fetched data.
   */
  private render(): void {
    // Select the SVG element defined in the HTML template
    const svg: Selection<SVGElement, number[], HTMLElement, null> = this.d3.select<SVGElement, null>(this.svg.nativeElement);

    let { width, height } = this.svg.nativeElement.getBoundingClientRect();

    const margin = { top: 20, right: 40, bottom: 110, left: 40 };
    const margin2 = { top: 430, right: 20, bottom: 30, left: 40 };
    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;
    const height2 = height + 125 - margin2.top - margin2.bottom;
    const interruptionBarWidth = 5;

    this.xScale = this.d3.scaleLinear().domain([0, this.fixationCounts.length]).range([0, width]);
    const x2 = this.d3.scaleLinear().domain([0, this.fixationCounts.length]).range([0, width]);
    const y = this.d3.scaleLinear().domain([0, this.d3.max(this.fixationCounts)]).range([height, 0]);
    const y2 = this.d3.scaleLinear().domain([0, this.d3.max(this.fixationCounts)]).range([height2, 0]);

    const xAxis = this.d3.axisBottom(this.xScale),
      xAxis2 = this.d3.axisBottom(x2),
      yAxis = this.d3.axisLeft(y);

    const brush = this.d3.brushX<number[]>()
      .extent([[0, 0], [width, height2]])
      .on('brush end', brushed.bind(this));

    const zoom = this.d3.zoom<SVGElement, number[]>()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on('zoom', zoomed.bind(this));

    const area = this.d3.area<number>()
      .curve(this.d3.curveMonotoneX)
      .x((d, i) => this.xScale(i))
      .y0(height)
      .y1((d) => y(d));

    svg.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height);

    const colorGroup = svg.append('svg:g').classed('colors-group', true);
    const colorGroup2 = svg.append('svg:g').classed('colors-group', true);

    const colorize2 = () => {
      colorGroup2.selectAll('rect').remove();
      colorGroup2.append('rect')
        .classed('normal', true)
        .attr('x', margin2.left)
        .attr('y', margin2.top)
        .attr('width', width)
        .attr('height', height2);

      this.ignored.forEach((ignored: IgnoredTimeSegment) => {
        const startPx = this.xScale(ignored.start);
        const endPx = this.xScale(ignored.end);
        const widthPx = Math.min(width - startPx, endPx - startPx);
        colorGroup2.append('rect')
          .classed('ignored', true)
          .attr('x', startPx + margin2.left)
          .attr('width', widthPx)
          .attr('y', margin2.top)
          .attr('height', height2);
      });

      this.interruptions.forEach((interruption: InterruptionTimePoint) => {
       const widthPx = interruptionBarWidth;
       const timestampPx = this.xScale(interruption.timestamp);
       let startPx = timestampPx - widthPx;
       startPx = Math.max(0, startPx);
        colorGroup2.append('rect')
          .classed('interrupt', true)
          .attr('x', startPx + margin2.left)
          .attr('width', widthPx)
          .attr('y', margin2.top)
          .attr('height', height2);
      });
    };

    const colorize = () => {
      colorGroup.selectAll('rect').remove();
      colorGroup.append('rect')
        .classed('normal', true)
        .attr('x', margin.left)
        .attr('y', margin.top)
        .attr('width', width)
        .attr('height', height);

      this.interruptions.forEach((interruption: InterruptionTimePoint) => {
        let widthPx = interruptionBarWidth;
        const timestampPx = this.xScale(interruption.timestamp);
        let startPx = timestampPx - widthPx;
        if (startPx > width || timestampPx < 0) {
          return;
        }
        startPx = Math.max(0, startPx);
        widthPx = Math.min(width - startPx, widthPx);
        colorGroup.append('rect')
          .classed('interrupt', true)
          .attr('x', startPx + margin.left)
          .attr('width', widthPx)
          .attr('y', margin.top)
          .attr('height', height);
      });

      this.ignored.concat(this.userIgnored).forEach((ignored: IgnoredTimeSegment) => {
        let startPx = this.xScale(ignored.start);
        const endPx = this.xScale(ignored.end);
        if (startPx > width || endPx < 0) {
          return;
        }
        startPx = Math.max(0, startPx);
        const widthPx = Math.min(width - startPx, endPx - startPx);
        colorGroup.append('rect')
          .classed('ignored', true)
          .attr('x', startPx + margin.left)
          .attr('width', widthPx)
          .attr('y', margin.top)
          .attr('height', height);
      });
    };
    colorize2();
    const area2 = this.d3.area<number>()
      .curve(this.d3.curveMonotoneX)
      .x((d, i) => x2(i))
      .y0(height2)
      .y1((d) => y2(d));

    const focus = svg.append('g')
      .attr('class', 'focus')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const context = svg.append('g')
      .attr('class', 'context')
      .attr('transform', 'translate(' + margin2.left + ',' + margin2.top + ')');

    focus.append('path')
      .datum(this.fixationCounts)
      .attr('class', 'area')
      .attr('d', area);

    focus.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    focus.append('g')
      .attr('class', 'axis axis--y')
      .call(yAxis);

    context.append('path')
      .datum(this.fixationCounts)
      .attr('class', 'area')
      .attr('d', area2);

    context.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + height2 + ')')
      .call(xAxis2);

    context.append('g')
      .attr('class', 'brush')
      .call(brush)
      .call(brush.move, this.xScale.range());

    svg.append('rect')
      .attr('class', 'zoom')
      .attr('width', width)
      .attr('height', height)
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .call(zoom);

    function brushed() {
      if (this.d3.event.sourceEvent && this.d3.event.sourceEvent.type === 'zoom') { return; } // ignore brush-by-zoom
      const s = this.d3.event.selection || x2.range();
      this.xScale.domain(s.map(x2.invert, x2));
      focus.select('.area').attr('d', area);
      focus.select('.axis--x').call(xAxis);
      svg.select('.zoom').call(zoom.transform, this.d3.zoomIdentity.scale(width / (s[1] - s[0])).translate(-s[0], 0));
      colorize();
    }

    function zoomed() {
      if (this.d3.event.sourceEvent && this.d3.event.sourceEvent.type === 'brush') { return; } // ignore zoom-by-brush
      const t = this.d3.event.transform;
      this.xScale.domain(t.rescaleX(x2).domain());
      focus.select('.area').attr('d', area);
      focus.select('.axis--x').call(xAxis);
      context.select('.brush').call(brush.move, this.xScale.range().map(t.invertX, t));
      colorize();
    }
  }

  public saveAnnotations(): void {
    let [start, end] = this.xScale.domain();
    start = Math.ceil(start);
    end = Math.floor(end);
    this.userIgnored.push({
      start,
      end,
      class: 'stripped',
      comment: 'Added by GaRSIVis'
    });
    this.render();
    const snackBarRef = this.snackBar.open(`Area [${start}, ${end}] marked as invalid`, 'UNDO', {
      duration: 5000,
    });
    snackBarRef.onAction().subscribe(() => {
      const index = this.userIgnored.findIndex((userIgnored: IgnoredTimeSegment) => {
        return userIgnored.start === start && userIgnored.end === end;
      });
      this.userIgnored.splice(index, 1);
      this.render();
    });
  }
}
