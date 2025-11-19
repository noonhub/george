import { useState, useRef, useCallback, useEffect } from 'react';
import type { Config, EpisodeResult, QTable, State, TrainingState, RouteHistoryEntry, ResourceSnapshot, DistractionKey } from '../types';
import { TileType } from '../types';
import { createInitialGrid, CONFIG } from '../constants';
import type { BatchUpdatePayload, TrainingWorkerCommand, TrainingWorkerResponse } from '../workers/trainingWorkerTypes';

const UI_BATCH_SIZE = 10;
const MIN_STATS_HISTORY = 500;

const findTilePosition = (grid: TileType[][], tileType: TileType): State => {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === tileType) {
        return [r, c] as State;
      }
    }
  }
  throw new Error(`Tile of type ${tileType} not found in grid.`);
};

export const useRLEngine = () => {
  const [grid, setGrid] = useState<TileType[][]>(createInitialGrid);
  const [config, setConfig] = useState<Config>(CONFIG);
  const [trainingState, setTrainingState] = useState<TrainingState>('IDLE');
  const [qTable, setQTable] = useState<QTable>({});
  const [episodeStats, setEpisodeStats] = useState<EpisodeResult[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [agentPath, setAgentPath] = useState<State[]>([]);
  const [resources, setResources] = useState<ResourceSnapshot>({
    timeRemaining: config.timeLimit,
    energy: config.energy,
    choresDone: 0,
    requiredChores: config.requiredChores,
    funVisited: 0,
  });
  const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const gridRef = useRef(grid);
  const configRef = useRef(config);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const postToWorker = useCallback((message: TrainingWorkerCommand) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);

  const initialize = useCallback(() => {
    if (!workerRef.current) return;
    try {
      const startState = findTilePosition(gridRef.current, TileType.KID);
      setAgentPath([startState]);
      setResources({
        timeRemaining: configRef.current.timeLimit,
        energy: configRef.current.energy,
        choresDone: 0,
        requiredChores: configRef.current.requiredChores,
        funVisited: 0,
      });
      setEpisodeStats([]);
      setRouteHistory([]);
      setQTable({});
      setCurrentEpisode(0);
      postToWorker({ type: 'RESET', grid: gridRef.current, config: configRef.current });
    } catch (error) {
      console.error('Initialization failed:', error);
      alert('Initialization failed. Make sure there is one Kid (start) and one Ice Cream Shop (goal) on the grid.');
      setTrainingState('IDLE');
    }
  }, [postToWorker]);

  const handleBatchUpdate = useCallback((payload: BatchUpdatePayload) => {
    if (payload.stats.length > 0) {
      setEpisodeStats(prev => {
        const combined = [...prev, ...payload.stats];
        const limit = Math.max(configRef.current.episodes, MIN_STATS_HISTORY);
        return combined.slice(-limit);
      });
    }
    if (payload.routes.length > 0) {
      setRouteHistory(prev => {
        const newestFirst = payload.routes.slice().reverse();
        const combined = [...newestFirst, ...prev];
        return combined.slice(0, 1000);
      });
    }
    if (payload.agentPath.length > 0) {
      setAgentPath(payload.agentPath);
    }
    setResources(payload.resources);
    setCurrentEpisode(payload.currentEpisode);
    setTrainingState(payload.trainingState);
    setQTable(payload.qTable);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/trainingWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = event => {
      const message = event.data as TrainingWorkerResponse;
      switch (message.type) {
        case 'BATCH_UPDATE':
          handleBatchUpdate(message.payload);
          break;
        case 'STATE':
          setTrainingState(message.payload.trainingState);
          setCurrentEpisode(message.payload.currentEpisode);
          setResources(message.payload.resources);
          break;
        case 'ERROR':
          console.error('[Training Worker]', message.payload.message);
          break;
      }
    };

    initialize();

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [handleBatchUpdate, initialize]);

  useEffect(() => {
    // Re-initialize only when fundamental things change, not every config tweak
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    grid,
    config.epsilon,
    config.timeLimit,
    config.timeCostPerMove,
    config.choreTimeBonus,
    config.funRewardScale,
    config.energy,
    config.energyMoveCost,
    config.choreEnergyCost,
    config.requiredChores,
    config.rewards,
  ]);

  useEffect(() => {
    if (workerRef.current) {
      postToWorker({ type: 'SET_CONFIG', config });
    }
  }, [config, postToWorker]);

  const startTraining = useCallback(() => {
    if (trainingState === 'IDLE' || trainingState === 'COMPLETE') {
      initialize();
    }
    setTrainingState('RUNNING');
    postToWorker({ type: 'START', batchSize: UI_BATCH_SIZE });
  }, [initialize, postToWorker, trainingState]);

  const pauseTraining = useCallback(() => {
    setTrainingState('PAUSED');
    postToWorker({ type: 'PAUSE' });
  }, [postToWorker]);

  const stopTraining = useCallback(() => {
    setTrainingState('IDLE');
    initialize();
  }, [initialize]);

  const updateGrid = useCallback((newGrid: TileType[][], newDistractionLayout?: Record<string, DistractionKey>) => {
    setTrainingState('IDLE');
    setGrid(newGrid);
    if (newDistractionLayout) {
      setConfig(prev => ({
        ...prev,
        distractionLayout: newDistractionLayout,
      }));
    }
  }, []);

  const updateConfig = (newConfig: Config) => {
    setConfig(newConfig);
    // If simulation is idle, update the step counter immediately
    if (trainingState === 'IDLE' || trainingState === 'PAUSED' || trainingState === 'COMPLETE') {
      setResources({
        timeRemaining: newConfig.timeLimit,
        energy: newConfig.energy,
        choresDone: 0,
        requiredChores: newConfig.requiredChores,
        funVisited: 0,
      });
    }
  };

  return {
    grid,
    qTable,
    config,
    trainingState,
    episodeStats,
    currentEpisode,
    agentPath,
    resources,
    routeHistory,
    actions: {
      start: startTraining,
      pause: pauseTraining,
      stop: stopTraining,
      updateConfig,
      updateGrid,
    },
  };
};
