import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChartModule } from 'angular2-highcharts';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { D3Service } from 'd3-ng2-service';
import * as Highcharts from 'highcharts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CleanModule } from './clean/clean.module';

declare function require(module: string): any;

export function highchartsFactory() {
  const HighchartsMore = require('highcharts/highcharts-more');
  HighchartsMore(Highcharts);
  return Highcharts;
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ChartModule,
    HttpClientModule,
    AppRoutingModule,
    CleanModule,
  ],
  providers: [
    D3Service,
    {
      provide: HighchartsStatic,
      useFactory: highchartsFactory
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
