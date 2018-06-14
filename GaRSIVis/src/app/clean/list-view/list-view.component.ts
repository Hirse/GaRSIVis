import { Component, OnInit } from '@angular/core';
import { ReadingService } from '../reading.service';

@Component({
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss']
})
export class ListViewComponent implements OnInit {
  public sessions: string[];

  constructor(
    private readingService: ReadingService,
  ) { }

  public ngOnInit(): void {
    this.readingService.getSessions().subscribe((sessions: string[]) => {
      this.sessions = sessions;
    });
  }
}
