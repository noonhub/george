import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Controls from '../components/Controls';
import { CONFIG } from '../constants';

const baseProps = {
  config: CONFIG,
  trainingState: 'IDLE' as const,
  onConfigChange: vi.fn(),
  onStart: vi.fn(),
  onPause: vi.fn(),
  onStop: vi.fn(),
  currentEpisode: 0,
  maxEpisodes: CONFIG.episodes,
  resources: {
    timeRemaining: CONFIG.timeLimit,
    energy: CONFIG.energy,
    choresDone: 0,
    requiredChores: CONFIG.requiredChores,
    funVisited: 0,
  },
};

const setup = (overrides: Partial<typeof baseProps> = {}) =>
  render(<Controls {...baseProps} {...overrides} />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Controls component', () => {
  it('calls onStart when start button is clicked while idle', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(baseProps.onStart).toHaveBeenCalledTimes(1);
  });

  it('calls onPause when training is running', () => {
    setup({ trainingState: 'RUNNING' });
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(baseProps.onPause).toHaveBeenCalledTimes(1);
  });

  it('disables reset button while idle and enables after running', () => {
    setup();
    const resetButton = screen.getByRole('button', { name: /reset/i });
    expect(resetButton).toBeDisabled();

    const onStop = vi.fn();
    cleanup();
    render(<Controls {...baseProps} trainingState="RUNNING" onStop={onStop} />);
    const enabledReset = screen.getByRole('button', { name: /reset/i });
    expect(enabledReset).not.toBeDisabled();
    fireEvent.click(enabledReset);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('propagates slider changes via onConfigChange', () => {
    const onConfigChange = vi.fn();
    setup({ onConfigChange });
    const bedtimeSlider = screen.getByLabelText(/Bedtime \(time left\)/i) as HTMLInputElement;
    fireEvent.change(bedtimeSlider, { target: { value: '25' } });
    expect(onConfigChange).toHaveBeenCalled();
  });
});
