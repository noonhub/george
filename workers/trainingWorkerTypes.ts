import type {
  Config,
  EpisodeResult,
  QTable,
  RouteHistoryEntry,
  State,
  ResourceSnapshot,
  TileType,
  TrainingState,
} from '../types';

export type TrainingWorkerCommand =
  | { type: 'RESET'; grid: TileType[][]; config: Config }
  | { type: 'SET_CONFIG'; config: Config }
  | { type: 'START'; batchSize: number }
  | { type: 'PAUSE' };

export interface BatchUpdatePayload {
  stats: EpisodeResult[];
  routes: RouteHistoryEntry[];
  agentPath: State[];
  resources: ResourceSnapshot;
  currentEpisode: number;
  trainingState: TrainingState;
  qTable: QTable;
}

export type TrainingWorkerResponse =
  | { type: 'BATCH_UPDATE'; payload: BatchUpdatePayload }
  | { type: 'STATE'; payload: { trainingState: TrainingState; currentEpisode: number; resources: ResourceSnapshot } }
  | { type: 'ERROR'; payload: { message: string } };
