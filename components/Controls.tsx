import React, { useState } from 'react';
import type { Config, ResourceSnapshot, RewardsConfig, TrainingState } from '../types';

interface ControlsProps {
  config: Config;
  resources: ResourceSnapshot;
  trainingState: TrainingState;
  onConfigChange: (newConfig: Config) => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  currentEpisode: number;
  maxEpisodes: number;
}

type ConfigKey = keyof Config;
type RewardKey = keyof RewardsConfig;

interface ParamMeta {
  label: string;
  key: ConfigKey | RewardKey;
  min: number;
  max: number;
  step: number;
  hint: string;
}

const simpleParams: ParamMeta[] = [
  { label: 'Bedtime (time left)', key: 'timeLimit', min: 10, max: 80, step: 1, hint: 'How much time before lights out.' },
  { label: 'Energy', key: 'energy', min: 5, max: 100, step: 1, hint: 'How much pep George starts with.' },
  { label: 'Chores to do', key: 'requiredChores', min: 0, max: 4, step: 1, hint: 'How many chores must be done first.' },
  { label: 'Fun level', key: 'funRewardScale', min: 0.5, max: 2, step: 0.1, hint: 'How tempting the fun stops feel.' },
  { label: 'Practice speed', key: 'speed', min: 1, max: 100, step: 1, hint: 'How fast practice runs play.' },
];

const learningParams: ParamMeta[] = [
  { label: 'Learning rate (alpha)', key: 'learningRate', min: 0.01, max: 1, step: 0.01, hint: 'How quickly George updates points from new moves.' },
  { label: 'Future points (gamma)', key: 'discountFactor', min: 0.1, max: 1, step: 0.01, hint: 'How much future points matter.' },
];

const explorationParams: ParamMeta[] = [
  { label: 'Explore chance (epsilon)', key: 'epsilon', min: 0, max: 1, step: 0.01, hint: 'How often George tries something random.' },
  { label: 'Explore decay', key: 'epsilonDecay', min: 0.9, max: 1, step: 0.0001, hint: 'How quickly curiosity shrinks.' },
  { label: 'Min explore', key: 'minEpsilon', min: 0, max: 0.5, step: 0.01, hint: 'Smallest curiosity allowed.' },
];

const timeEnergyParams: ParamMeta[] = [
  { label: 'Time cost per step', key: 'timeCostPerMove', min: 1, max: 5, step: 1, hint: 'Minutes lost each move.' },
  { label: 'Time bonus per chore', key: 'choreTimeBonus', min: 0, max: 10, step: 1, hint: 'Minutes earned by chores.' },
  { label: 'Energy per step', key: 'energyMoveCost', min: 0, max: 5, step: 0.5, hint: 'Energy burned each move.' },
  { label: 'Energy per chore', key: 'choreEnergyCost', min: 0, max: 5, step: 0.5, hint: 'Energy burned doing chores.' },
  { label: 'Time bucket size', key: 'timeBucketSize', min: 1, max: 6, step: 1, hint: 'How coarsely time is grouped for learning.' },
  { label: 'Energy bucket size', key: 'energyBucketSize', min: 1, max: 6, step: 1, hint: 'How coarsely energy is grouped for learning.' },
];

const rewardParams: ParamMeta[] = [
  { label: 'Points: Ice cream', key: 'goal', min: 0, max: 200, step: 1, hint: 'Big reward for success.' },
  { label: 'Oops: Bedtime or meltdown', key: 'failure', min: -200, max: 0, step: 1, hint: 'Penalty for failing a run.' },
  { label: 'Oops: Sneaking ice cream', key: 'earlyIceCreamPenalty', min: -100, max: 0, step: 1, hint: 'Penalty for trying without chores.' },
  { label: 'Points: Each chore', key: 'choreReward', min: 0, max: 30, step: 1, hint: 'Bonus per chore finished.' },
  { label: 'Oops: Revisiting tiles', key: 'revisitPenalty', min: -10, max: 0, step: 0.5, hint: 'Small penalty for backtracking.' },
  { label: 'Points: Fun memories', key: 'distractionBonus', min: 0, max: 20, step: 0.5, hint: 'Bonus for unique fun stops when finishing.' },
  { label: 'Oops: Each step', key: 'step', min: -5, max: 0, step: 0.1, hint: 'Tiny cost to keep George moving cleverly.' },
];

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const applyParam = (config: Config, meta: ParamMeta, raw: number): Config => {
  const clamped = clampValue(raw, meta.min, meta.max);
  if (meta.key in config.rewards) {
    return {
      ...config,
      rewards: {
        ...config.rewards,
        [meta.key as RewardKey]: clamped,
      },
    };
  }
  return {
    ...config,
    [meta.key]: clamped,
  };
};

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm9 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
  </svg>
);

const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
  </svg>
);

const Controls: React.FC<ControlsProps> = ({
  config,
  resources,
  trainingState,
  onConfigChange,
  onStart,
  onPause,
  onStop,
  currentEpisode,
  maxEpisodes,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSimpleChange = (meta: ParamMeta, value: number) => {
    onConfigChange(applyParam(config, meta, value));
  };

  const handleAdvancedChange = (meta: ParamMeta, value: number) => {
    onConfigChange(applyParam(config, meta, value));
  };

  const isRunning = trainingState === 'RUNNING';
  const isIdle = trainingState === 'IDLE';

  const successSummary = `George must reach the Ice Cream shop before lights out in ${config.timeLimit} minutes and after finishing ${config.requiredChores} chores. Each move costs ${config.timeCostPerMove} minute${config.timeCostPerMove !== 1 ? 's' : ''} and ${config.energyMoveCost} energy; chores add ${config.choreTimeBonus} minute${config.choreTimeBonus !== 1 ? 's' : ''} back but burn ${config.choreEnergyCost} energy. He starts with ${config.energy} energy. Fun stops give scaled fun (${config.funRewardScale}× each spot’s funReward), cost their time penalty, and boost energy. Success pays ${config.rewards.goal} points plus ${config.rewards.distractionBonus} per unique fun stop; each step costs ${config.rewards.step} and revisits cost ${config.rewards.revisitPenalty}. Going for ice cream early costs ${config.rewards.earlyIceCreamPenalty}, and failure from bedtime or meltdown costs ${config.rewards.failure}.`;

  return (
    <div className="p-5 bg-[#17181b] border border-white/5 rounded-3xl shadow-xl shadow-black/30 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#42dca3] tracking-wide uppercase">Controls</h3>
        <div className="flex gap-2 flex-wrap justify-end">
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-white/5 text-[#42dca3]">
            Time: {resources.timeRemaining.toFixed(0)}
          </span>
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-white/5 text-orange-300">
            Energy: {resources.energy.toFixed(0)} / {config.energy}
          </span>
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-white/5 text-blue-200">
            Chores: {resources.choresDone}/{config.requiredChores}
          </span>
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-white/5 text-gray-300">
            Practice: {currentEpisode} / {maxEpisodes}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-3">
        {successSummary}
      </p>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className="bg-[#42dca3] h-2.5 rounded-full transition-all" style={{ width: `${(currentEpisode / maxEpisodes) * 100}%` }}></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <button
          onClick={isRunning ? onPause : onStart}
          className="flex items-center justify-center gap-2 px-4 py-2 font-semibold text-[#0b0c0f] bg-[#42dca3] rounded-full hover:bg-[#3ac091] disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
        >
          {isRunning ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          <span>{isRunning ? 'Pause' : (trainingState === 'PAUSED' ? 'Resume' : 'Start')}</span>
        </button>
        <button
          onClick={onStop}
          disabled={isIdle}
          className="flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-white/10 rounded-full hover:bg-white/20 disabled:bg-gray-700 transition-colors"
        >
          <StopIcon className="w-5 h-5" />
          <span>Reset</span>
        </button>
        <button
          onClick={() => setShowAdvanced(prev => !prev)}
          className="flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-3 bg-white/5 p-3 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-[#42dca3]">Simple mode</h4>
            <p className="text-xs text-gray-400">Good defaults for a quick demo.</p>
          </div>
          {simpleParams.map(meta => (
            <ParameterSlider
              key={meta.key as string}
              meta={meta}
              value={meta.key in config.rewards ? (config.rewards as Record<string, number>)[meta.key as string] : (config as Record<string, number>)[meta.key as string]}
              onChange={(val) => handleSimpleChange(meta, val)}
            />
          ))}
        </div>

        {showAdvanced && (
          <div className="space-y-3 bg-white/5 p-3 rounded-2xl border border-white/10">
            <h4 className="font-semibold text-[#42dca3]">Advanced knobs</h4>
            <p className="text-xs text-gray-400">Tweak how George learns and spends time/energy.</p>

            <ParamGroup title="Learning">
              {learningParams.map(meta => (
                <ParameterSlider
                  key={meta.key as string}
                  meta={meta}
                  value={(config as Record<string, number>)[meta.key as string]}
                  onChange={(val) => handleAdvancedChange(meta, val)}
                />
              ))}
            </ParamGroup>

            <ParamGroup title="Exploration">
              {explorationParams.map(meta => (
                <ParameterSlider
                  key={meta.key as string}
                  meta={meta}
                  value={(config as Record<string, number>)[meta.key as string]}
                  onChange={(val) => handleAdvancedChange(meta, val)}
                />
              ))}
            </ParamGroup>

            <ParamGroup title="Time & Energy">
              {timeEnergyParams.map(meta => (
                <ParameterSlider
                  key={meta.key as string}
                  meta={meta}
                  value={(config as Record<string, number>)[meta.key as string]}
                  onChange={(val) => handleAdvancedChange(meta, val)}
                />
              ))}
            </ParamGroup>

            <ParamGroup title="Points & Oops">
              {rewardParams.map(meta => (
                <ParameterSlider
                  key={meta.key as string}
                  meta={meta}
                  value={(config.rewards as Record<string, number>)[meta.key as string]}
                  onChange={(val) => handleAdvancedChange(meta, val)}
                />
              ))}
            </ParamGroup>
          </div>
        )}
      </div>
    </div>
  );
};

const ParamGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
    <p className="text-sm font-semibold text-gray-200">{title}</p>
    <div className="space-y-3">{children}</div>
  </div>
);

interface ParameterSliderProps {
  meta: ParamMeta;
  value: number;
  onChange: (value: number) => void;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({ meta, value, onChange }) => (
  <div>
    <label htmlFor={meta.key as string} className="block mb-1 text-sm font-medium text-gray-300">
      {meta.label}: {value.toFixed(2)}
    </label>
    <input
      type="range"
      id={meta.key as string}
      name={meta.key as string}
      min={meta.min}
      max={meta.max}
      step={meta.step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
    />
    <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
  </div>
);

export default Controls;
