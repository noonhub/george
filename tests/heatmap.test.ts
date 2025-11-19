import { describe, expect, it } from 'vitest';
import type { RouteHistoryEntry, State } from '../types';
import { computeSimpleHeatmap } from '../viz/heatmap';

const state = (row: number, col: number): State => [row, col];

const buildHistory = (entries: Array<{ path: State[]; reward: number }>): RouteHistoryEntry[] =>
  entries.map(entry => ({ path: entry.path, reward: entry.reward }));

describe('computeSimpleHeatmap', () => {
  it('creates bands based on scores', () => {
    const history = buildHistory([
      { path: [state(0, 0), state(0, 1)], reward: 10 },
      { path: [state(1, 1)], reward: 5 },
    ]);

    const hm = computeSimpleHeatmap(history, 3)!;
    expect(hm.heatmap[0][0]?.band).toBe('high');
    expect(hm.heatmap[1][1]?.band).toBe('medium');
  });

  it('returns null for empty history', () => {
    expect(computeSimpleHeatmap([], 4)).toBeNull();
  });
});
