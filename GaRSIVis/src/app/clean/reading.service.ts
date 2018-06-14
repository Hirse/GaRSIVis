import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { WebSocketSubject } from 'rxjs/observable/dom/WebSocketSubject';

import 'rxjs/add/observable/dom/webSocket';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';

import { Chunk, IgnoredTimeSegment, PredictionResult, PredictionSummary, PreprocessedSession } from './interfaces';

/**
 * Service to provide data for components in the clean-module.
 */
@Injectable()
export class ReadingService {
  private static wsUrl = `ws://${window.location.hostname}:3002`;
  private static dataUrl = `http://${window.location.hostname}:3001`;

  private ws$: WebSocketSubject<string>;
  private webSocketOpen: boolean;

  constructor(
    private http: HttpClient
  ) {
    this.webSocketOpen = false;
    this.ws$ = Observable.webSocket<string>(ReadingService.wsUrl);
    this.ws$.subscribe(() => {
      this.webSocketOpen = true;
    }, null, () => {
      this.webSocketOpen = false;
    });
  }

  /**
   * Map websocket message type as they get parsed automatically.
   */
  private getMappedObservable(): Observable<WSMessage> {
    return this.ws$.map<string, WSMessage>((message: string) => {
      return message as any as WSMessage;
    });
  }

  public getAnnotationUpdates(sessionName: string): Observable<boolean> {
    return this.getMappedObservable().filter((message: WSMessage) => {
      return message.type === 'ignored' && (message as WSAnnotationMessage).payload.session === sessionName;
    }).map<WSMessage, boolean>((message: WSAnnotationMessage) => {
      return message.payload.valid;
    });
  }

  public getChunkUpdates(sessionName: string): Observable<boolean> {
    return this.getMappedObservable().filter((message: WSMessage) => {
      return message.type === 'chunk' && (message as WSChunkMessage).payload.session === sessionName;
    }).map<WSMessage, boolean>((message: WSChunkMessage) => {
      return message.payload.valid;
    });
  }

  public getPredictionUpdates(sessionName: string): Observable<boolean> {
    return this.getMappedObservable().filter((message: WSMessage) => {
      return message.type === 'predict' && (message as WSPredictMessage).payload.session === sessionName;
    }).map<WSMessage, boolean>((message: WSPredictMessage) => {
      return message.payload.valid;
    });
  }

  public getPredictionSummaryUpdates(): Observable<boolean> {
    return this.getMappedObservable().filter((message: WSMessage) => {
      return message.type === 'prediction_summary';
    }).map<WSMessage, boolean>((message: WSSummaryMessage) => {
      return message.payload.valid;
    });
  }

  public setAnnotations(sessionName: string, annotations: IgnoredTimeSegment[]): void {
    this.ws$.next(JSON.stringify({
      type: 'annotations',
      session: sessionName,
      annotations: annotations,
    }));
  }

  public setChunkSize(chunkSize: number): void {
    this.ws$.next(JSON.stringify({
      type: 'chunkSize',
      chunkSize: chunkSize,
    }));
  }

  /**
   * Get the preprocessed data for a single session.
   * @param sessionName Name of a session
   * @returns Preprocessed session information
   */
  public querySession(sessionName: string): Observable<PreprocessedSession> {
    return this.http.get<PreprocessedSession>(`${this.getPathPrefix()}/preprocessed/${sessionName}.json`);
  }

  /**
   * Get the chunked data for a single session.
   * @param sessionName Name of a session
   * @returns Chunked data of that session
   */
  public queryChunks(sessionName: string): Observable<Chunk[]> {
    return this.http.get<Chunk[]>(`${this.getPathPrefix()}/chunks/${sessionName}.json`);
  }

  /**
   * Get the prediction data for a single session.
   * @param sessionName Name of a session
   * @returns Prediction data of that session
   */
  public queryPredictions(sessionName: string): Observable<PredictionResult> {
    return this.http.get<PredictionResult>(`${this.getPathPrefix()}/predictions/${sessionName}.json`);
  }

  /**
   * Get the list of available session names.
   * @returns List of session names
   */
  public getSessions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.getPathPrefix()}/list.json`);
  }

  /**
   * Get the current prediction summary.
   * @returns Prediction summary
   */
  public getPredictionSummary(): Observable<PredictionSummary> {
    return this.http.get<PredictionSummary>(`${this.getPathPrefix()}/predictions.json`);
  }

  private getPathPrefix(): string {
    return `${ReadingService.dataUrl}/data`;
  }
}

export interface WSMessage {
  type: 'ignored' | 'chunk' | 'predict' | 'prediction_summary';
  payload: any;
}

export interface WSAnnotationMessage extends WSMessage {
  type: 'ignored';
  payload: WSSessionMessagePayload;
}

export interface WSChunkMessage extends WSMessage {
  type: 'chunk';
  payload: WSSessionMessagePayload;
}

export interface WSSessionMessagePayload {
  session: string;
  valid: boolean;
}

export interface WSPredictMessage extends WSMessage {
  type: 'predict';
  payload: WSSessionMessagePayload;
}

export interface WSSummaryMessage extends WSMessage {
  type: 'prediction_summary';
  payload: {
    valid: boolean;
  };
}
