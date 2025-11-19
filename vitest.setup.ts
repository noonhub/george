import '@testing-library/jest-dom/vitest';
import type { TrainingWorkerResponse } from './workers/trainingWorkerTypes';
import type { EpisodeResult, RouteHistoryEntry, State } from './types';

class MockWorker {
  public onmessage: ((event: { data: TrainingWorkerResponse }) => void) | null = null;
  private episode = 0;
  private lastPath: State[] = [[0, 0]];

  postMessage(message: { type: string }) {
    switch (message.type) {
      case 'RESET':
        this.episode = 0;
        this.lastPath = [[0, 0]];
        break;
      case 'START':
        this.emitBatch();
        break;
      case 'PAUSE':
        this.emitState('PAUSED');
        break;
      case 'SET_CONFIG':
        break;
      default:
        break;
    }
  }

  terminate() {
    this.onmessage = null;
  }

  private emitBatch() {
    this.episode += 1;
    const stats: EpisodeResult[] = [
      { episode: this.episode, steps: 3, totalReward: 15, status: 'SUCCESS' },
    ];
    const routes: RouteHistoryEntry[] = [{ path: this.lastPath, reward: 15 }];
    const resources = { timeRemaining: 10, energy: 8, choresDone: 1, requiredChores: 2, funVisited: 0 };
    const payload: TrainingWorkerResponse = {
      type: 'BATCH_UPDATE',
      payload: {
        stats,
        routes,
        agentPath: this.lastPath,
        resources,
        currentEpisode: this.episode,
        trainingState: 'RUNNING',
        qTable: {},
      },
    };

    setTimeout(() => {
      this.onmessage?.({ data: payload });
    }, 10);
  }

  private emitState(state: 'PAUSED' | 'IDLE' | 'RUNNING' | 'COMPLETE') {
    const payload: TrainingWorkerResponse = {
      type: 'STATE',
      payload: {
        trainingState: state,
        currentEpisode: this.episode,
        resources: { timeRemaining: 10, energy: 8, choresDone: 1, requiredChores: 2, funVisited: 0 },
      },
    };
    setTimeout(() => {
      this.onmessage?.({ data: payload });
    }, 0);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Worker = MockWorker;
