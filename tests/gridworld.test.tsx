import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GridWorld from '../components/GridWorld';
import { createInitialGrid, CONFIG } from '../constants';
import type { State } from '../types';
import { Action, TileType as TileEnum } from '../types';

const baseGrid = createInitialGrid();
const defaultPath: State[] = [[1, 1]];

const renderGridWorld = (overrides: Partial<React.ComponentProps<typeof GridWorld>> = {}) => {
  const props: React.ComponentProps<typeof GridWorld> = {
    grid: baseGrid.map(row => [...row]),
    agentPath: defaultPath,
    routeHistory: [],
    trainingState: 'IDLE',
    onGridChange: vi.fn(),
    qTable: {},
    distractionLayout: CONFIG.distractionLayout,
    distractionTypes: CONFIG.distractionTypes,
    defaultDistractionType: CONFIG.defaultDistractionType,
    ...overrides,
  };
  const utils = render(<GridWorld {...props} />);
  return { ...utils, props };
};

describe('GridWorld component', () => {
  it('allows editing tiles when idle', () => {
    const { props } = renderGridWorld();
    const tile = screen.getByTestId('tile-1-1');
    fireEvent.click(tile);
    expect(props.onGridChange).toHaveBeenCalled();
    const updatedGrid = props.onGridChange.mock.calls[0][0] as TileEnum[][];
    expect(updatedGrid[1][1]).toBe(TileEnum.WALL);
  });

  it('toggles the q-learning heatmap', () => {
    const qTable = {
      '0,0|0|t1|e1|c0': { [Action.RIGHT]: 1, [Action.DOWN]: 0.5 },
    };
    renderGridWorld({ trainingState: 'RUNNING', qTable });
    const select = screen.getByLabelText(/Heatmap view/i);
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe('policy');
    fireEvent.change(select, { target: { value: 'off' } });
    expect((select as HTMLSelectElement).value).toBe('off');
  });
});
