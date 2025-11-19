import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useRLEngine } from '../hooks/useRLEngine';
import { Action, type ObservedState } from '../types';

const observedState = (row: number, col: number): ObservedState => ({
  position: [row, col],
  visitMask: 0,
  timeBucket: 1,
  energyBucket: 1,
  choresDone: 0,
});

const mockStepResult = { nextState: observedState(0, 1), reward: 0, status: 'SUCCESS' as const, done: true };

vi.mock('../rl/env', () => {
  class GridWorldEnvMock {
    remainingSteps = 10;
    constructor() {}
    reset = vi.fn(() => observedState(0, 0));
    getAgentStartState = vi.fn(() => [0, 0] as const);
    getRemainingSteps = vi.fn(() => this.remainingSteps);
    getResources = vi.fn(() => ({
      timeRemaining: this.remainingSteps,
      energy: 5,
      choresDone: 0,
      requiredChores: 2,
      funVisited: 0,
    }));
    step = vi.fn(() => mockStepResult);
  }
  return { GridWorldEnv: GridWorldEnvMock };
});

vi.mock('../rl/qlearning', () => {
  class QLearningAgentMock {
    trainEpisode = vi.fn(() => ({
      steps: 3,
      totalReward: 15,
      status: 'SUCCESS' as const,
      path: [[0, 0]] as const,
      remainingSteps: 8,
      resources: { timeRemaining: 8, energy: 7, choresDone: 1, requiredChores: 2, funVisited: 0 },
    }));
    chooseAction = vi.fn(() => Action.RIGHT);
    getQTable = vi.fn(() => ({}));
    setConfig = vi.fn();
    constructor() {}
  }
  return { QLearningAgent: QLearningAgentMock };
});

describe('useRLEngine hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts training and records stats/paths', () => {
    const { result } = renderHook(() => useRLEngine());

    act(() => {
      result.current.actions.start();
    });

    act(() => {
      vi.advanceTimersByTime(25);
    });

    expect(result.current.trainingState).toBe('RUNNING');
    expect(result.current.currentEpisode).toBe(1);
    expect(result.current.episodeStats).toHaveLength(1);
    expect(result.current.routeHistory).toHaveLength(1);
  });

  it('pauses and stops training correctly', () => {
    const { result } = renderHook(() => useRLEngine());
    act(() => {
      result.current.actions.start();
    });

    act(() => {
      result.current.actions.pause();
    });
    expect(result.current.trainingState).toBe('PAUSED');

    act(() => {
      result.current.actions.stop();
    });

    expect(result.current.trainingState).toBe('IDLE');
    expect(result.current.routeHistory).toHaveLength(0);
  });
});
