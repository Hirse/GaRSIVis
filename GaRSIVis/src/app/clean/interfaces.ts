/**
 * A single reading session.
 * Usually one paper from one participant.
 */
export interface PreprocessedSession {
  /** Fixations per second. The session lasted as many seconds as the length of the count list. */
  counts: number[];
  /** Time segments that are stripped from further analysis. */
  ignored: IgnoredTimeSegment[];
  /** Time points at which an interruption happened. */
  interruptions: InterruptionTimePoint[];
}

export interface IgnoredTimeSegment {
  /** Start of the segment as timestamp (ms since epoch). */
  start: number;
  /** End of the segment as timestamp (ms since epoch). */
  end: number;
  /** Segment classification. */
  class: 'stripped';
  /** Human-readable comment for debugging. */
  comment?: string;
}

export interface InterruptionTimePoint {
  /** Point in time in seconds relative to the session start. */
  timestamp: number;
  /** Segment classification. */
  class: 'target';
  /** Reason for a segment being classified as 'target'. null in cases of application switch. */
  reason: 'distraction' | 'interruption' | 'work' | null;
  /** List of windows active after an application switch. */
  active: AvtiveWindow[];
}

/** Active window when the Reader is not focussed. */
export interface AvtiveWindow {
  /** App ID. On Windows, the .exe file used to run the application. */
  app_id: string;
  /** Window title. */
  app_title: string;
}

/**
 * A chunk of data from a single session.
 */
export interface Chunk {
  /** Start of the segment as relative time (seconds since session start). */
  start: number;
  /** End of the segment as relative time (seconds since session start). */
  end: number;
  /** Whether this chunk of time happened right before an interruption. */
  interruption: boolean;
  fixations: {
    count: number;
    duration: {
      avg: number;
      med: number;
      min: number;
      max: number;
      var: number;
    };
  };
  saccades: {
    duration: {
      avg: number;
      med: number;
      min: number;
      max: number;
      var: number;
    };
    length: {
      avg: number;
      med: number;
      min: number;
      max: number;
      var: number;
    };
    angle: {
      avg: number;
      med: number;
      min: number;
      max: number;
      var: number;
    };
  };
}

export interface PredictionSummary {
  chunk_size: number;
  accuracy: number;
  precision: number;
  recall: number;
}

export interface PredictionResult extends PredictionSummary {
  /**
   * List of classification results.
   * 0 for a chunk classified as normal.
   * 1 for a chunk classified as before an interruption.
   */
  prediction: Prediction[];
}

export type Prediction = 0 | 1;
