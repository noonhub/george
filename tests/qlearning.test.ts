import { describe, expect, it, vi, afterEach } from 'vitest';
import { QLearningAgent, stateToString } from '../rl/qlearning';
import { Action, type Config, type ObservedState } from '../types';

const config: Config = {
  learningRate: 0.5,
  discountFactor: 0.9,
  epsilon: 1,
  epsilonDecay: 0.99,
  minEpsilon: 0.01,
  episodes: 1,
  episodeHardCap: 10,
  speed: 1,
  timeLimit: 10,
  timeCostPerMove: 1,
  choreTimeBonus: 1,
  requiredChores: 1,
  timeBucketSize: 2,
  funRewardScale: 1,
  energy: 10,
  energyMoveCost: 1,
  choreEnergyCost: 1,
  energyBucketSize: 2,
  distractionTypes: {
    TV: { label: 'TV', funReward: 5, timePenalty: 1, energyBoost: 1 },
    FRIENDS: { label: 'Friends', funReward: 5, timePenalty: 1, energyBoost: 1 },
    PLAYGROUND: { label: 'Playground', funReward: 5, timePenalty: 1, energyBoost: 1 },
  },
  distractionLayout: {},
  defaultDistractionType: 'PLAYGROUND',
  choreAssignments: {},
  rewards: {
    goal: 10,
    step: -1,
    failure: -5,
    distractionBonus: 0,
    choreReward: 2,
    revisitPenalty: -0.5,
    earlyIceCreamPenalty: -2,
    bedtimeFailure: -5,
    meltdownFailure: -5,
  },
};

const observedState = (row: number, col: number, mask = 0): ObservedState => ({
  position: [row, col],
  visitMask: mask,
  timeBucket: 1,
  energyBucket: 1,
  choresDone: 0,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QLearningAgent', () => {
  it('stores Q-values separately for different visit masks', () => {
    const agent = new QLearningAgent(config);
    const stateA = observedState(1, 1, 0);
    const stateB = observedState(1, 1, 1);

    agent.updateQValue(stateA, Action.RIGHT, 5, stateA);
    agent.updateQValue(stateB, Action.RIGHT, 2, stateB);

    const table = agent.getQTable();
    expect(table[stateToString(stateA)]?.[Action.RIGHT]).not.toBeUndefined();
    expect(table[stateToString(stateB)]?.[Action.RIGHT]).not.toBeUndefined();
    expect(table[stateToString(stateA)]?.[Action.RIGHT]).not.toEqual(
      table[stateToString(stateB)]?.[Action.RIGHT]
    );
  });

  it('chooses the best-known action when epsilon is zero', () => {
    const agent = new QLearningAgent(config);
    agent.setConfig({ ...config, epsilon: 0 });

    const state = observedState(0, 0, 0);
    agent.updateQValue(state, Action.UP, 1, state);
    agent.updateQValue(state, Action.RIGHT, 3, state);

    const action = agent.chooseAction(state);
    expect(action).toBe(Action.RIGHT);
  });
});
