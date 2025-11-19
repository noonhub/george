import React, { useMemo, useState } from 'react';
import type {
  State,
  TileType,
  RouteHistoryEntry,
  TrainingState,
  QTable,
  DistractionKey,
  DistractionTypeConfig,
} from '../types';
import { Action, TileType as TileEnum } from '../types';
import { GRID_SIZE, TILE_COLORS, TILE_EMOJIS, DISTRACTION_EMOJIS, TILE_TO_DISTRACTION } from '../constants';
import { computePolicyHeatmap, computeRouteHeatmap, type HeatmapCell, type PolicyHeatmapCell } from '../viz/heatmap';

interface GridWorldProps {
  grid: TileType[][];
  agentPath: State[];
  routeHistory: RouteHistoryEntry[];
  trainingState: TrainingState;
  onGridChange: (newGrid: TileType[][], newDistractionLayout?: Record<string, DistractionKey>) => void;
  qTable?: QTable;
  distractionLayout: Record<string, DistractionKey>;
  distractionTypes: Record<DistractionKey, DistractionTypeConfig>;
  defaultDistractionType: DistractionKey;
}

const tileTypesToEdit: { name: string; type: TileEnum; distractionType?: DistractionKey; emoji?: string }[] = [
  { name: 'Empty', type: TileEnum.EMPTY },
  { name: 'Fence', type: TileEnum.WALL },
  { name: 'George start', type: TileEnum.KID },
  { name: 'Ice Cream Store', type: TileEnum.ICE_CREAM },
  { name: 'TV fun stop', type: TileEnum.TV, distractionType: 'TV', emoji: DISTRACTION_EMOJIS.TV },
  { name: 'Friends fun stop', type: TileEnum.FRIENDS, distractionType: 'FRIENDS', emoji: DISTRACTION_EMOJIS.FRIENDS },
  { name: 'Playground fun stop', type: TileEnum.PLAYGROUND, distractionType: 'PLAYGROUND', emoji: DISTRACTION_EMOJIS.PLAYGROUND },
  { name: 'Homework', type: TileEnum.HOMEWORK },
  { name: 'Feed the dog', type: TileEnum.CHORE_FEED_DOG },
  { name: 'Clean your room', type: TileEnum.CHORE_CLEAN_ROOM },
  { name: 'Take out the trash', type: TileEnum.CHORE_TAKE_OUT_TRASH },
  { name: 'Reading practice', type: TileEnum.CHORE_READING_PRACTICE },
];

const HEATMAP_COLORS: Record<HeatmapCell['band'], string> = {
  low: 'rgba(255, 237, 213, 0.5)',
  medium: 'rgba(251, 191, 36, 0.55)',
  high: 'rgba(52, 211, 153, 0.6)',
};

const ACTION_ARROWS: Record<Action, string> = {
  [Action.UP]: '↑',
  [Action.DOWN]: '↓',
  [Action.LEFT]: '←',
  [Action.RIGHT]: '→',
};

type HeatmapMode = 'off' | 'routes' | 'policy';

const footprintOpacity = (index: number, total: number) => {
  if (total <= 1) return 0.9;
  const progress = index / (total - 1);
  return 0.4 + 0.5 * (1 - progress);
};

const HeatmapTile: React.FC<{
  type: TileType;
  heat: HeatmapCell | PolicyHeatmapCell | null;
  showHeatmap: boolean;
  showPolicyArrow?: boolean;
  emoji?: string;
}> = ({ type, heat, showHeatmap, showPolicyArrow, emoji }) => {
  const baseColor = TILE_COLORS[type] || TILE_COLORS[TileEnum.EMPTY];
  const heatStyle = showHeatmap && heat ? { backgroundColor: HEATMAP_COLORS[heat.band] } : {};
  const tileEmoji = emoji ?? TILE_EMOJIS[type];

  return (
    <div className={`w-full h-full ${baseColor} border border-white/5 relative flex items-center justify-center rounded-md overflow-hidden`}>
      <div className="absolute inset-0 transition-colors duration-200" style={heatStyle}></div>
      {showPolicyArrow && heat && 'bestAction' in heat && heat.bestAction !== null && (
        <span className="text-sm z-20 text-black/70 drop-shadow-sm">{ACTION_ARROWS[heat.bestAction]}</span>
      )}
      <span className="text-2xl z-10" role="img">{tileEmoji}</span>
    </div>
  );
};

const GridWorld: React.FC<GridWorldProps> = ({
  grid,
  agentPath,
  routeHistory,
  trainingState,
  onGridChange,
  qTable = {},
  distractionLayout,
  distractionTypes,
  defaultDistractionType,
}) => {
  const [selectedTile, setSelectedTile] = useState<TileEnum>(TileEnum.WALL);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('policy');
  const isEditable = trainingState === 'IDLE';
  const routeHeatmap = useMemo(() => computeRouteHeatmap(routeHistory, GRID_SIZE, 200), [routeHistory]);
  const policyHeatmap = useMemo(() => computePolicyHeatmap(qTable, GRID_SIZE), [qTable]);

  const activeHeatmap = heatmapMode === 'routes' ? routeHeatmap : heatmapMode === 'policy' ? policyHeatmap : null;

  const footprintMap = useMemo(() => {
    const map = new Map<string, number>();
    agentPath.forEach((pos, idx) => map.set(`${pos[0]},${pos[1]}`, idx));
    return { map, total: agentPath.length };
  }, [agentPath]);

  const getDistractionPresentation = (row: number, col: number) => {
    const key = `${row},${col}`;
    const tileType = grid[row][col];
    const inferredType = TILE_TO_DISTRACTION[tileType] ?? defaultDistractionType;
    const typeKey = distractionLayout[key] ?? inferredType;
    const config = distractionTypes[typeKey] ?? distractionTypes[defaultDistractionType];
    return {
      typeKey,
      emoji: DISTRACTION_EMOJIS[typeKey] ?? DISTRACTION_EMOJIS[defaultDistractionType],
      label: config?.label ?? typeKey,
      config,
    };
  };

  const handleTileChange = (r: number, c: number, tileToSet: TileEnum) => {
    const newGrid = grid.map(row => [...row]);
    const key = `${r},${c}`;
    const previousTile = grid[r][c];
    let nextLayout: Record<string, DistractionKey> | undefined;

    if (tileToSet === TileEnum.KID || tileToSet === TileEnum.ICE_CREAM) {
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (newGrid[i][j] === tileToSet) {
            newGrid[i][j] = TileEnum.EMPTY;
          }
        }
      }
    }
    newGrid[r][c] = tileToSet;
    const newDistractionKey = TILE_TO_DISTRACTION[tileToSet];
    const previousDistractionKey = TILE_TO_DISTRACTION[previousTile];

    if (newDistractionKey) {
      nextLayout = { ...distractionLayout, [key]: newDistractionKey };
    } else if (previousDistractionKey || key in distractionLayout) {
      const updatedLayout = { ...distractionLayout };
      delete updatedLayout[key];
      nextLayout = updatedLayout;
    }
    onGridChange(newGrid, nextLayout);
  };

  const agentPos = agentPath[agentPath.length - 1];
  const boardMaxSize = 'min(70vh, calc(100vw - 2.5rem))';

  return (
    <div className="flex flex-col gap-4">
      {isEditable && (
        <div className="p-4 mb-2 bg-[#18191c] border border-white/5 rounded-2xl flex items-center justify-center gap-2 flex-wrap shadow-lg shadow-black/30">
          {tileTypesToEdit.map((option) => (
            <button
              key={option.name}
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData('tileType', option.type.toString());
              }}
              onClick={() => {
                setSelectedTile(option.type);
              }}
              className={`px-3 py-2 rounded-md transition-all text-sm flex items-center gap-2 ${
                selectedTile === option.type ? 'ring-2 ring-cyan-400 bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">{option.emoji ?? TILE_EMOJIS[option.type]}</span>
              <span>{option.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-[#0f1013] border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h4 className="text-sm font-semibold text-[#42dca3] uppercase tracking-wide">Fun stop types</h4>
          <p className="text-xs text-gray-400">
            Each distraction trades points for time and energy differently. George learns which ones help him finish.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(distractionTypes).map(([key, config]) => (
            <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-label={`${config.label} icon`}>
                    {DISTRACTION_EMOJIS[key as DistractionKey]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-100">{config.label}</p>
                    <p className="text-[11px] text-gray-400">{key === defaultDistractionType ? 'Default fun stop' : 'Placed fun stop'}</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-black/40 border border-white/10 text-gray-200">
                  {key}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-300">
                <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                  <p className="text-[10px] uppercase text-gray-500">Fun</p>
                  <p className="font-semibold text-emerald-300">{config.funReward}</p>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                  <p className="text-[10px] uppercase text-gray-500">Time cost</p>
                  <p className="font-semibold text-amber-300">-{config.timePenalty}</p>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                  <p className="text-[10px] uppercase text-gray-500">Energy</p>
                  <p className="font-semibold text-sky-300">+{config.energyBoost}</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                Feels like +{config.funReward} points of fun, but costs {config.timePenalty} time and restores {config.energyBoost} energy when George visits for the first time.
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Footprints show George’s latest path.</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-300 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Heatmap view</span>
            <select
              value={heatmapMode}
              onChange={e => setHeatmapMode(e.target.value as HeatmapMode)}
              className="bg-[#1f2229] border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="policy">Q-learning (value + policy)</option>
              <option value="routes">Recent routes (tried)</option>
              <option value="off">Off</option>
            </select>
          </label>
          <span className="text-xs text-gray-400">
            {heatmapMode === 'routes'
              ? 'Recent routes: where George has been trying, weighted by how well they scored.'
              : heatmapMode === 'policy'
              ? 'Q-learning: colors reflect the strongest learned Q-values; arrows mark the action George favors.'
              : 'Toggle to explore where George is learning to go.'}
          </span>
        </div>
      </div>

      <div
        className={`aspect-square w-full min-w-0 mx-auto bg-[#0f1013] grid rounded-3xl border border-white/5 p-2 ${
          isEditable ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          width: '100%',
          maxWidth: boardMaxSize,
          maxHeight: boardMaxSize,
        }}
        onMouseDown={() => isEditable && setIsMouseDown(true)}
        onMouseUp={() => setIsMouseDown(false)}
        onMouseLeave={() => setIsMouseDown(false)}
      >
        {grid.map((row, r) =>
          row.map((tile, c) => {
            const posKey = `${r},${c}`;
            const distractionInfo = TILE_TO_DISTRACTION[tile] ? getDistractionPresentation(r, c) : null;
            if (isEditable) {
              return (
                <div
                  key={`${r}-${c}-edit`}
                  data-testid={`tile-${r}-${c}`}
                  onClick={() => handleTileChange(r, c, selectedTile)}
                  onMouseEnter={() => isMouseDown && handleTileChange(r, c, selectedTile)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const tileType = parseInt(e.dataTransfer.getData('tileType'), 10) as TileEnum;
                    if (!isNaN(tileType)) {
                      handleTileChange(r, c, tileType);
                    }
                  }}
                  className={`aspect-square w-full h-full ${TILE_COLORS[tile]} border border-white/5 flex items-center justify-center transition-all hover:scale-105 text-2xl rounded-lg relative`}
                >
                  {distractionInfo ? (
                    <>
                      <span role="img">{distractionInfo.emoji}</span>
                    </>
                  ) : (
                    TILE_EMOJIS[tile]
                  )}
                </div>
              );
            }

            const isAgentHere = agentPos && agentPos[0] === r && agentPos[1] === c;
            const tileTypeToRender = tile === TileEnum.KID && !isAgentHere ? TileEnum.EMPTY : tile;
            const footprintIndex = footprintMap.map.get(posKey);
            const footprintStyle =
              footprintIndex !== undefined
                ? { opacity: footprintOpacity(footprintIndex, footprintMap.total) }
                : undefined;

            const heat = activeHeatmap ? activeHeatmap.heatmap[r][c] : null;
            return (
              <div key={`${r}-${c}-run`} data-testid={`tile-${r}-${c}`} className="relative aspect-square min-w-0">
                <HeatmapTile
                  type={tileTypeToRender}
                  heat={heat}
                  showHeatmap={heatmapMode !== 'off'}
                  showPolicyArrow={heatmapMode === 'policy'}
                  emoji={distractionInfo?.emoji}
                />
                {footprintIndex !== undefined && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 text-2xl pointer-events-none" style={footprintStyle}>
                    <span role="img" aria-label="footsteps">👣</span>
                  </div>
                )}
                {isAgentHere && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <span className="text-4xl animate-bounce" role="img">{TILE_EMOJIS[TileEnum.KID]}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GridWorld;
