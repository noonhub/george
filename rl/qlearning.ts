import type { ObservedState, QTable, Config, EpisodeResult, State, ResourceSnapshot } from '../types';
import { Action } from '../types';
import { GridWorldEnv } from './env';
import { ACTIONS } from '../constants';

export function stateToString(state: ObservedState): string {
  const [row, col] = state.position;
  return `${row},${col}|${state.visitMask}|t${state.timeBucket}|e${state.energyBucket}|c${state.choresDone}`;
}

export class QLearningAgent {
  private qTable: QTable = {};
  private config: Config;
  private actions: Action[];
  private currentEpsilon: number;

  constructor(config: Config) {
    this.config = config;
    this.actions = ACTIONS;
    this.currentEpsilon = config.epsilon;
  }

  private getQValue(state: ObservedState, action: Action): number {
    const stateKey = stateToString(state);
    return this.qTable[stateKey]?.[action] ?? 0;
  }

  public chooseAction(state: ObservedState): Action {
    if (Math.random() < this.currentEpsilon) {
      return this.actions[Math.floor(Math.random() * this.actions.length)];
    } else {
      const stateKey = stateToString(state);
      const qValues = this.qTable[stateKey] ?? {};
      let bestAction = this.actions[0];
      let maxQ = -Infinity;

      for (const action of this.actions) {
        const q = qValues[action] ?? 0;
        if (q > maxQ) {
          maxQ = q;
          bestAction = action;
        }
      }
      return bestAction;
    }
  }

  public updateQValue(state: ObservedState, action: Action, reward: number, nextState: ObservedState): void {
    const oldQ = this.getQValue(state, action);
    
    const nextStateKey = stateToString(nextState);
    const nextQValues = this.qTable[nextStateKey] ?? {};
    let maxNextQ = -Infinity;
    if (Object.keys(nextQValues).length > 0) {
        maxNextQ = Math.max(...Object.values(nextQValues).map(v => v || 0));
    } else {
        maxNextQ = 0;
    }

    const newQ = oldQ + this.config.learningRate * (reward + this.config.discountFactor * maxNextQ - oldQ);
    
    const stateKey = stateToString(state);
    if (!this.qTable[stateKey]) {
      this.qTable[stateKey] = {};
    }
    this.qTable[stateKey][action] = newQ;
  }

  public trainEpisode(env: GridWorldEnv): Omit<EpisodeResult, 'episode'> & { path: State[]; remainingSteps: number; resources: ResourceSnapshot } {
    let state = env.reset();
    const path: State[] = [state.position];
    let totalReward = 0;
    let steps = 0;
    let done = false;
    let status: EpisodeResult['status'] = 'FAILURE';

    while (!done && steps < this.config.episodeHardCap) {
      const action = this.chooseAction(state);
      // FIX: Use the result object directly to allow TypeScript to narrow types based on the discriminated union.
      // This resolves the error where `episodeStatus` could be 'IN_PROGRESS'.
      const stepResult = env.step(action);
      this.updateQValue(state, action, stepResult.reward, stepResult.nextState);
      
      state = stepResult.nextState;
      path.push(stepResult.nextState.position);
      totalReward += stepResult.reward;
      steps++;
      done = stepResult.done;
      if (stepResult.done) {
        status = stepResult.status;
      }
    }
    
    // Decay epsilon
    this.currentEpsilon = Math.max(this.config.minEpsilon, this.currentEpsilon * this.config.epsilonDecay);

    return { steps, totalReward, status, path, remainingSteps: env.getRemainingSteps(), resources: env.getResources() };
  }
  
  public getQTable(): QTable {
    return this.qTable;
  }

  public reset(): void {
    this.qTable = {};
    this.currentEpsilon = this.config.epsilon;
  }

  public setConfig(newConfig: Config) {
    const shouldResetEpsilon = newConfig.epsilon !== this.config.epsilon;
    this.config = newConfig;
    if (shouldResetEpsilon) {
        this.currentEpsilon = this.config.epsilon;
    }
  }
}
