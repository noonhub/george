import type { Action, PolicyCellStats, QTable, RouteHistoryEntry } from '../types';

export interface HeatmapCell {
  score: number;
  band: 'low' | 'medium' | 'high';
}

export interface RouteHeatmap {
  heatmap: (HeatmapCell | null)[][];
}

export interface PolicyHeatmapCell extends PolicyCellStats {
  band: HeatmapCell['band'];
}

export interface PolicyHeatmap {
  heatmap: (PolicyHeatmapCell | null)[][];
}

const bandForRatio = (ratio: number): HeatmapCell['band'] =>
  ratio > 0.66 ? 'high' : ratio > 0.33 ? 'medium' : 'low';

/**
 * Aggregates the last N routes into a gentle 3-band heatmap.
 * - Unique cells per route are counted once per episode (recent experiences).
 * - Cells are weighted by total route reward (positive routes contribute more).
 * - Output is normalized to the strongest cell and mapped to low/medium/high bands.
 */
export function computeRouteHeatmap(routeHistory: RouteHistoryEntry[], size: number, maxRoutes = 200): RouteHeatmap | null {
  if (routeHistory.length === 0) return null;

  const recent = routeHistory.slice(0, maxRoutes);
  const cellScores: Record<string, number> = {};

  for (const route of recent) {
    const uniquePositions = new Set(route.path.map(p => `${p[0]},${p[1]}`));
    // Weight successes more heavily so successful paths light up clearly near the goal.
    const baseWeight = Math.max(route.reward, 0.1);
    const successMultiplier = route.reward > 0 ? 3 : 1;
    const weight = baseWeight * successMultiplier;
    uniquePositions.forEach(key => {
      cellScores[key] = (cellScores[key] ?? 0) + weight;
    });
  }

  const maxScore = Math.max(...Object.values(cellScores));
  const heatmap: (HeatmapCell | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  Object.entries(cellScores).forEach(([key, score]) => {
    const [r, c] = key.split(',').map(Number);
    const ratio = score / (maxScore || 1);
    heatmap[r][c] = { score, band: bandForRatio(ratio) };
  });

  return { heatmap };
}

// Backwards-compatible alias for earlier naming.
export const computeSimpleHeatmap = computeRouteHeatmap;

/**
 * Approximates a Q-learning value heatmap from the Q-table.
 * - Parses state keys to (row,col) and finds the best-valued action per state.
 * - Aggregates the best values per cell (averaged) and counts contributing states.
 * - Normalizes the average best value across cells to [0,1] using min/max range so
 *   negative values still map into the gradient.
 */
export function computePolicyHeatmap(
  qTable: QTable | null | undefined,
  size: number
): PolicyHeatmap | null {
  if (!qTable) return null;

  const cells: Record<
    string,
    {
      total: number;
      count: number;
      actionCounts: Partial<Record<Action, number>>;
    }
  > = {};

  const tableEntries = Object.entries(qTable);
  if (tableEntries.length === 0) return null;

  tableEntries.forEach(([stateKey, actions]) => {
    const [pos] = stateKey.split('|');
    if (!pos) return;
    const [rStr, cStr] = pos.split(',');
    const row = Number(rStr);
    const col = Number(cStr);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    let bestAction: Action | null = null;
    let bestValue = -Infinity;
    (Object.entries(actions) as [Action, number | undefined][]).forEach(([action, value]) => {
      const q = value ?? -Infinity;
      if (q > bestValue) {
        bestValue = q;
        bestAction = action;
      }
    });
    if (bestAction === null) return;

    const key = `${row},${col}`;
    if (!cells[key]) {
      cells[key] = { total: 0, count: 0, actionCounts: {} };
    }
    cells[key].total += bestValue;
    cells[key].count += 1;
    cells[key].actionCounts[bestAction] = (cells[key].actionCounts[bestAction] ?? 0) + 1;
  });

  const cellEntries = Object.entries(cells);
  if (cellEntries.length === 0) return null;

  const averageValues = cellEntries.map(([, data]) => data.total / Math.max(data.count, 1));
  const maxAvg = Math.max(...averageValues);
  const minAvg = Math.min(...averageValues);
  const range = maxAvg - minAvg || 1;

  const heatmap: (PolicyHeatmapCell | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  cellEntries.forEach(([key, data]) => {
    const [r, c] = key.split(',').map(Number);
    const avg = data.total / Math.max(data.count, 1);
    const normalizedValue = (avg - minAvg) / range;
    const bestAction = Object.entries(data.actionCounts).reduce<Action | null>(
      (best, [action, count]) => {
        if (best === null) return action as Action;
        const bestCount = data.actionCounts[best] ?? 0;
        return count! > bestCount ? (action as Action) : best;
      },
      null
    );

    heatmap[r][c] = {
      row: r,
      col: c,
      bestAction,
      bestValue: avg,
      normalizedValue,
      visitCount: data.count,
      band: bandForRatio(normalizedValue),
    };
  });

  return { heatmap };
}
