import type { State, Config, ObservedState, ResourceSnapshot, DistractionKey, ChoreTileType } from '../types';
import { Action, TileType } from '../types';
import { ACTION_MAP, TILE_TO_DISTRACTION, CHORE_TILE_SET } from '../constants';

type StepResult =
  | { nextState: ObservedState; reward: number; done: true; status: 'SUCCESS' | 'FAILURE' }
  | { nextState: ObservedState; reward: number; done: false; status: 'IN_PROGRESS' };

const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, 0], // Up
  [1, 0],  // Down
  [0, -1], // Left
  [0, 1],  // Right
];

const positionKey = (state: State) => `${state[0]},${state[1]}`;

/**
 * GridWorldEnv now models bedtime pressure, chores gating, typed distractions, energy,
 * and softer revisit rules while keeping the same step/reset interface for Q-learning.
 * Key mechanics:
 * - timeRemaining ticks down each move ("time before bedtime"); episode fails if it hits zero.
 * - energy drains each move/chores and boosts on fun tiles; zero energy is a meltdown (failure).
 * - chores gate the goal; George needs requiredChores before ice cream counts as success.
 * - distractions grant funReward but cost extra time; different distraction types have different tradeoffs.
 * - revisits are allowed but lose their fun bonus and apply a small penalty.
 */
export class GridWorldEnv {
  private grid: TileType[][];
  private agentStartPos: State;
  private goalPos: State;
  private size: number;
  private config: Config;

  // Episode-specific state
  private agentPos: State;
  private timeRemaining: number;
  private energy: number;
  private visitCounts: Map<string, number>;
  private distractionsVisited: Set<string>;
  private choresCompleted: Set<string>;
  private choresDoneCount: number;


  constructor(grid: TileType[][], config: Config) {
    this.grid = grid.map(row => [...row]);
    this.size = grid.length;
    this.config = config;
    this.agentStartPos = this.findTile(TileType.KID);
    this.goalPos = this.findTile(TileType.ICE_CREAM);
    
    // Initialize episode state
    this.agentPos = this.agentStartPos;
    this.timeRemaining = config.timeLimit;
    this.energy = config.energy;
    this.distractionsVisited = new Set();
    this.visitCounts = new Map([[positionKey(this.agentStartPos), 1]]);
    this.choresCompleted = new Set();
    this.choresDoneCount = 0;
  }

  private findTile(tileType: TileType): State {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === tileType) {
          return [r, c];
        }
      }
    }
    throw new Error(`Tile of type ${tileType} not found in grid.`);
  }
  
  public getAgentStartState(): State {
    return this.agentStartPos;
  }

  public getRemainingSteps(): number {
    return this.timeRemaining;
  }

  public getResources(): ResourceSnapshot {
    return {
      timeRemaining: this.timeRemaining,
      energy: this.energy,
      choresDone: this.choresDoneCount,
      requiredChores: this.config.requiredChores,
      funVisited: this.distractionsVisited.size,
    };
  }

  public reset(): ObservedState {
    this.agentPos = this.agentStartPos;
    this.timeRemaining = this.config.timeLimit;
    this.energy = this.config.energy;
    this.distractionsVisited = new Set();
    this.visitCounts = new Map([[positionKey(this.agentStartPos), 1]]);
    this.choresCompleted = new Set();
    this.choresDoneCount = 0;
    return this.getObservedState();
  }

  private getObservedState(pos: State = this.agentPos): ObservedState {
    const visitMask = NEIGHBOR_OFFSETS.reduce((mask, [dr, dc], idx) => {
      const neighbor: State = [pos[0] + dr, pos[1] + dc];
      if ((this.visitCounts.get(positionKey(neighbor)) ?? 0) > 0) {
        return mask | (1 << idx);
      }
      return mask;
    }, 0);

    // Buckets keep the state tiny for the demo: higher bucket size = coarser grouping.
    const bucket = (value: number, bucketSize: number) =>
      Math.max(0, Math.ceil(value / Math.max(bucketSize, 1)));

    return { 
      position: pos,
      visitMask,
      timeBucket: bucket(this.timeRemaining, this.config.timeBucketSize),
      energyBucket: bucket(this.energy, this.config.energyBucketSize),
      choresDone: this.choresDoneCount,
    };
  }

  private applyResourceFailure(): StepResult | null {
    if (this.timeRemaining < 0 || this.timeRemaining === 0) {
      return {
        nextState: this.getObservedState(),
        reward: this.config.rewards.bedtimeFailure ?? this.config.rewards.failure,
        done: true,
        status: 'FAILURE',
      };
    }

    if (this.energy <= 0) {
      return {
        nextState: this.getObservedState(),
        reward: this.config.rewards.meltdownFailure ?? this.config.rewards.failure,
        done: true,
        status: 'FAILURE',
      };
    }

    return null;
  }

  private getDistractionKey(tile: TileType, position: string): DistractionKey {
    return (
      this.config.distractionLayout[position] ??
      TILE_TO_DISTRACTION[tile] ??
      this.config.defaultDistractionType
    );
  }

  private getDistractionType(position: string, tile: TileType) {
    const typeKey = this.getDistractionKey(tile, position);
    return this.config.distractionTypes[typeKey] ?? this.config.distractionTypes[this.config.defaultDistractionType];
  }

  private canCelebrate(): boolean {
    return this.choresDoneCount >= this.config.requiredChores && this.timeRemaining >= 0 && this.energy > 0;
  }

  public step(action: Action): StepResult {
    const [dr, dc] = ACTION_MAP[action];
    const [r, c] = this.agentPos;
    const nextState: State = [r + dr, c + dc];
    const [nextRow, nextCol] = nextState;
    const nextStateKey = positionKey(nextState);

    // Base per-move costs
    this.timeRemaining -= this.config.timeCostPerMove;
    this.energy -= this.config.energyMoveCost;
    let reward = this.config.rewards.step;

    // Wall collision: stay in place but still pay the cost
    if (
      nextRow < 0 ||
      nextRow >= this.size ||
      nextCol < 0 ||
      nextCol >= this.size ||
      this.grid[nextRow][nextCol] === TileType.WALL
    ) {
      const failureCheck = this.applyResourceFailure();
      if (failureCheck) return failureCheck;
      return { nextState: this.getObservedState(), reward, done: false, status: 'IN_PROGRESS' };
    }

    // Move succeeds
    this.agentPos = nextState;
    const currentCount = this.visitCounts.get(nextStateKey) ?? 0;
    const isFirstVisit = currentCount === 0;
    this.visitCounts.set(nextStateKey, currentCount + 1);

    const nextTile = this.grid[nextRow][nextCol];

    const isFunTile = TILE_TO_DISTRACTION[nextTile] !== undefined;

    if (isFunTile) {
      const distraction = this.getDistractionType(nextStateKey, nextTile);
      if (isFirstVisit) {
        reward += distraction.funReward * (this.config.funRewardScale ?? 1);
        this.timeRemaining -= distraction.timePenalty;
        this.energy = Math.min(this.config.energy, this.energy + distraction.energyBoost);
        this.distractionsVisited.add(nextStateKey);
      } else {
        reward += this.config.rewards.revisitPenalty;
      }
    } else if (CHORE_TILE_SET.has(nextTile as ChoreTileType)) {
      const alreadyDone = this.choresCompleted.has(nextStateKey);
      if (!alreadyDone) {
        this.choresCompleted.add(nextStateKey);
        this.choresDoneCount += 1;
        reward += this.config.rewards.choreReward;
        this.timeRemaining += this.config.choreTimeBonus;
      } else {
        reward += this.config.rewards.revisitPenalty;
      }
      this.energy -= this.config.choreEnergyCost;
    } else {
      switch (nextTile) {
        case TileType.ICE_CREAM: {
          if (this.canCelebrate()) {
            const celebratoryBonus = this.distractionsVisited.size * this.config.rewards.distractionBonus;
            const successReward = this.config.rewards.goal + celebratoryBonus;
            return { nextState: this.getObservedState(), reward: successReward, done: true, status: 'SUCCESS' };
          }
          reward += this.config.rewards.earlyIceCreamPenalty;
          break;
        }
        default: {
          if (!isFirstVisit) {
            reward += this.config.rewards.revisitPenalty;
          }
        }
      }
    }

    const failureCheckAfterTile = this.applyResourceFailure();
    if (failureCheckAfterTile) return failureCheckAfterTile;

    return { nextState: this.getObservedState(), reward, done: false, status: 'IN_PROGRESS' };
  }
}
