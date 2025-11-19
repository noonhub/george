import { describe, expect, it } from 'vitest';
import { GridWorldEnv } from '../rl/env';
import { Action, TileType, type Config } from '../types';

const testGrid: TileType[][] = [
  [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
  [TileType.WALL, TileType.KID, TileType.EMPTY, TileType.ICE_CREAM, TileType.WALL],
  [TileType.WALL, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.WALL],
  [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
];

const baseConfig: Config = {
  learningRate: 0.1,
  discountFactor: 0.9,
  epsilon: 1,
  epsilonDecay: 0.99,
  minEpsilon: 0.01,
  episodes: 10,
  episodeHardCap: 30,
  speed: 1,
  timeLimit: 20,
  timeCostPerMove: 1,
  choreTimeBonus: 0,
  requiredChores: 0,
  timeBucketSize: 1,
  funRewardScale: 1,
  energy: 10,
  energyMoveCost: 0,
  choreEnergyCost: 0,
  energyBucketSize: 1,
  distractionTypes: {
    TV: { label: 'TV', funReward: 5, timePenalty: 1, energyBoost: 1 },
    FRIENDS: { label: 'Friends', funReward: 5, timePenalty: 1, energyBoost: 1 },
    PLAYGROUND: { label: 'Playground', funReward: 5, timePenalty: 1, energyBoost: 1 },
  },
  distractionLayout: {},
  defaultDistractionType: 'PLAYGROUND',
  choreAssignments: {},
  rewards: {
    goal: 100,
    step: -1,
    failure: -50,
    distractionBonus: 0,
    choreReward: 0,
    revisitPenalty: -0.5,
    earlyIceCreamPenalty: -5,
  },
};

const createEnv = () => new GridWorldEnv(testGrid, baseConfig);

describe('GridWorldEnv', () => {
  it('builds visit masks for neighboring cells', () => {
    const env = createEnv();
    env.reset();

    const firstMove = env.step(Action.RIGHT);
    expect(firstMove.done).toBe(false);
    expect(firstMove.nextState.position).toEqual([1, 2]);
    // Bit 2 represents the left neighbor (already visited start tile)
    expect(firstMove.nextState.visitMask & (1 << 2)).toBeTruthy();
  });

  it('penalizes but allows revisiting cells', () => {
    const env = createEnv();
    env.reset();

    env.step(Action.RIGHT); // move to empty tile
    const revisit = env.step(Action.LEFT);

    expect(revisit.done).toBe(false);
    expect(revisit.status).toBe('IN_PROGRESS');
    expect(revisit.reward).toBeCloseTo(baseConfig.rewards.step + baseConfig.rewards.revisitPenalty);
  });

  it('awards success when reaching the goal', () => {
    const env = createEnv();
    env.reset();

    env.step(Action.RIGHT);
    const success = env.step(Action.RIGHT);

    expect(success.done).toBe(true);
    expect(success.status).toBe('SUCCESS');
    expect(success.reward).toBe(baseConfig.rewards.goal);
  });
});
