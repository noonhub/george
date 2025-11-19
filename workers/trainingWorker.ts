/// <reference lib="webworker" />
import { GridWorldEnv } from '../rl/env';
import { QLearningAgent } from '../rl/qlearning';
import type { TrainingWorkerCommand, TrainingWorkerResponse } from './trainingWorkerTypes';
import type { Config, EpisodeResult, ResourceSnapshot, RouteHistoryEntry, State, TileType, TrainingState } from '../types';
import { CONFIG, createInitialGrid } from '../constants';

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

const DEFAULT_BATCH_SIZE = 10;

const initialResources = (cfg: Config): ResourceSnapshot => ({
  timeRemaining: cfg.timeLimit,
  energy: cfg.energy,
  choresDone: 0,
  requiredChores: cfg.requiredChores,
  funVisited: 0,
});

let grid: TileType[][] = createInitialGrid();
let config: Config = CONFIG;
let env: GridWorldEnv | null = null;
let agent: QLearningAgent | null = null;
let isRunning = false;
let currentEpisode = 0;
let batchSize = DEFAULT_BATCH_SIZE;
let batchStats: EpisodeResult[] = [];
let batchRoutes: RouteHistoryEntry[] = [];
let lastPath: State[] = [];
let resources: ResourceSnapshot = initialResources(CONFIG);
let timer: ReturnType<typeof setTimeout> | null = null;

const cloneGrid = (source: TileType[][]): TileType[][] => source.map(row => [...row]);

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

const resetEnvironment = () => {
  env = new GridWorldEnv(grid, config);
  agent = new QLearningAgent(config);
  currentEpisode = 0;
  resources = initialResources(config);
  lastPath = [env.getAgentStartState()];
  batchStats = [];
  batchRoutes = [];
};

const flushBatch = (trainingState: TrainingState) => {
  if (!agent) return;
  if (batchStats.length === 0 && trainingState === 'RUNNING') {
    return;
  }

  const response: TrainingWorkerResponse = {
    type: 'BATCH_UPDATE',
    payload: {
      stats: batchStats,
      routes: batchRoutes,
      agentPath: lastPath,
      resources,
      currentEpisode,
      trainingState,
      qTable: agent.getQTable(),
    },
  };

  ctx.postMessage(response);
  batchStats = [];
  batchRoutes = [];
};

const scheduleNextEpisode = () => {
  clearTimer();
  const delay = Math.max(1, Math.floor(1000 / Math.max(config.speed, 1)));
  timer = setTimeout(runEpisode, delay);
};

const runEpisode = () => {
  if (!isRunning || !env || !agent) {
    return;
  }

  if (currentEpisode >= config.episodes) {
    isRunning = false;
    flushBatch('COMPLETE');
    return;
  }

  const trainingResult = agent.trainEpisode(env);
  currentEpisode += 1;

  const episodeResult: EpisodeResult = {
    episode: currentEpisode,
    steps: trainingResult.steps,
    totalReward: trainingResult.totalReward,
    status: trainingResult.status,
  };

  batchStats.push(episodeResult);
  batchRoutes.push({ path: trainingResult.path, reward: trainingResult.totalReward });
  lastPath = trainingResult.path;
  resources = trainingResult.resources;

  const reachedEpisodeLimit = currentEpisode >= config.episodes;
  if (batchStats.length >= batchSize || reachedEpisodeLimit) {
    flushBatch(reachedEpisodeLimit ? 'COMPLETE' : 'RUNNING');
  }

  if (reachedEpisodeLimit) {
    isRunning = false;
    clearTimer();
    return;
  }

  if (isRunning) {
    scheduleNextEpisode();
  }
};

const startTraining = (incomingBatchSize: number) => {
  if (!env || !agent) {
    resetEnvironment();
  }
  batchSize = incomingBatchSize || DEFAULT_BATCH_SIZE;
  if (batchSize <= 0) {
    batchSize = DEFAULT_BATCH_SIZE;
  }
  if (isRunning) {
    return;
  }
  isRunning = true;
  scheduleNextEpisode();
};

const pauseTraining = () => {
  isRunning = false;
  clearTimer();
  flushBatch('PAUSED');
};

const applyCommand = (message: TrainingWorkerCommand) => {
  switch (message.type) {
    case 'RESET':
      clearTimer();
      isRunning = false;
      grid = cloneGrid(message.grid);
      config = message.config;
      resetEnvironment();
      break;
    case 'SET_CONFIG':
      config = message.config;
      if (agent) {
        agent.setConfig(config);
      } else {
        agent = new QLearningAgent(config);
      }
      env = new GridWorldEnv(grid, config);
      resources = initialResources(config);
      break;
    case 'START':
      startTraining(message.batchSize);
      break;
    case 'PAUSE':
      pauseTraining();
      break;
    default:
      ctx.postMessage({
        type: 'ERROR',
        payload: { message: `Unknown command: ${(message as { type: string }).type}` },
      });
  }
};

ctx.onmessage = event => {
  try {
    applyCommand(event.data as TrainingWorkerCommand);
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      payload: { message: error instanceof Error ? error.message : 'Unknown worker error' },
    });
  }
};

export {};
