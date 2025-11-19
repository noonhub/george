export enum TileType {
  EMPTY,
  WALL,
  KID, // Start/Home
  ICE_CREAM, // Goal
  TV,
  FRIENDS,
  PLAYGROUND,
  HOMEWORK,
  CHORE,
  CHORE_FEED_DOG,
  CHORE_CLEAN_ROOM,
  CHORE_TAKE_OUT_TRASH,
  CHORE_READING_PRACTICE,
}

export enum Action {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export type State = readonly [row: number, col: number];

export type DistractionKey = 'TV' | 'FRIENDS' | 'PLAYGROUND';

export type ChoreTileType =
  | TileType.HOMEWORK
  | TileType.CHORE
  | TileType.CHORE_FEED_DOG
  | TileType.CHORE_CLEAN_ROOM
  | TileType.CHORE_TAKE_OUT_TRASH
  | TileType.CHORE_READING_PRACTICE;

export interface DistractionTypeConfig {
  label: string;
  funReward: number;
  timePenalty: number;
  energyBoost: number;
}

export interface ResourceSnapshot {
  timeRemaining: number;
  energy: number;
  choresDone: number;
  requiredChores: number;
  funVisited: number;
}

export interface WorldDefinition {
  size: number;
  kidStart: State;
  iceCream: State;
  walls: State[];
  funSpots: { position: State; type: DistractionKey }[];
  chores: { position: State; label: string; type: ChoreTileType }[];
}

/**
 * Observed state returned to the Q-learning agent.
 * visitMask is a 4-bit mask (UP, DOWN, LEFT, RIGHT) indicating whether that neighbor
 * has already been visited in the current episode.
 * timeBucket and energyBucket are coarse buckets to keep the state space manageable.
 */
export interface ObservedState {
  position: State;
  visitMask: number;
  timeBucket: number;
  energyBucket: number;
  choresDone: number;
}

export type QTable = {
  [stateKey: string]: { [action in Action]?: number };
};

export interface RewardsConfig {
  step: number; // Penalty for non-terminal steps
  distractionBonus: number; // Bonus per distraction on success (beta)
  goal: number; // Base reward for success
  failure: number; // Penalty for failure
  choreReward: number; // Reward per completed chore
  revisitPenalty: number; // Penalty for revisiting a tile
  earlyIceCreamPenalty: number; // Penalty for trying to reach goal before chores are done
  bedtimeFailure?: number; // Optional override when time runs out
  meltdownFailure?: number; // Optional override when energy hits zero
}

export interface Config {
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
  episodes: number;
  episodeHardCap: number; // Safety break for training loops
  speed: number;

  // Time before bedtime and chores
  timeLimit: number;
  timeCostPerMove: number;
  choreTimeBonus: number;
  requiredChores: number;
  timeBucketSize: number;
  funRewardScale: number;

  // Energy / mood
  energy: number;
  energyMoveCost: number;
  choreEnergyCost: number;
  energyBucketSize: number;

  // Exploration constraints
  distractionTypes: Record<DistractionKey, DistractionTypeConfig>;
  distractionLayout: Record<string, DistractionKey>;
  defaultDistractionType: DistractionKey;
  choreAssignments: Record<string, string>;
  
  // Reward Structure
  rewards: RewardsConfig;
}

export interface EpisodeResult {
  episode: number;
  steps: number;
  totalReward: number;
  status: 'SUCCESS' | 'FAILURE';
}

export interface RouteHistoryEntry {
  path: State[];
  reward: number;
}

export interface RewardSeriesPoint {
  episode: number;
  totalReward: number;
}

export interface SuccessSeriesPoint {
  episode: number;
  success: 0 | 1;
}

export interface RollingSuccessPoint {
  episode: number;
  rate: number;
  window: number;
}

export interface PolicyCellStats {
  row: number;
  col: number;
  bestAction: Action | null;
  bestValue: number;
  normalizedValue: number;
  visitCount: number;
}

export type TrainingState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE';
