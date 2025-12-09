
export type Point = {
  x: number;
  y: number;
};

export enum ShotResult {
  GOAL = 'GOAL',
  SAVE = 'SAVE',
  MISS = 'MISS',
}

export enum GameSituation {
  EVEN_STRENGTH = 'EV',
  PENALTY_KILL = 'PK',
  POWER_PLAY = 'PP',
}

export interface Shot {
  id: string;
  origin: Point; // Normalized 0-100 on floor
  placement: Point | null; // Normalized 0-100 on goal mouth
  result: ShotResult;
  situation: GameSituation;
  isRebound: boolean;
  isControlled?: boolean; // New field for controlled saves
  period: number;
  timeRemaining: string; // MM:SS
  timestamp: number;
}

export interface GameMetadata {
  opponent: string;
  location: string;
  date: string; // ISO String
}

export interface GameSession {
  id: string;
  metadata: GameMetadata;
  shots: Shot[];
  stats: {
    saves: number;
    goals: number;
    total: number;
    percentage: number;
  };
  timestamp: number;
}

export enum AppState {
  HOME = 'HOME',
  GAME_SETUP = 'GAME_SETUP',
  RECORDING_ORIGIN = 'RECORDING_ORIGIN',
  RECORDING_PLACEMENT = 'RECORDING_PLACEMENT',
  RECORDING_DETAILS = 'RECORDING_DETAILS',
  SUMMARY = 'SUMMARY',
  HISTORY = 'HISTORY',
}
