import type { Config, DistractionKey, DistractionTypeConfig, RewardsConfig, WorldDefinition, State, ChoreTileType } from './types';
import { TileType, Action } from './types';

export { TileType };

export const WORLD_DEFINITION: WorldDefinition = {
  size: 9,
  kidStart: [1, 1],
  iceCream: [7, 4],
  walls: [
    [2, 3], [3, 3],
    [5, 2], [5, 3],
  ],
  funSpots: [
    { position: [1, 5], type: 'TV' },
    { position: [4, 2], type: 'FRIENDS' },
    { position: [6, 3], type: 'PLAYGROUND' },
  ],
  chores: [
    { position: [2, 1], label: 'Feed the dog', type: TileType.CHORE_FEED_DOG },
    { position: [4, 5], label: 'Clean your room', type: TileType.CHORE_CLEAN_ROOM },
    { position: [2, 6], label: 'Do your math worksheet', type: TileType.HOMEWORK },
    { position: [5, 6], label: 'Take out the trash', type: TileType.CHORE_TAKE_OUT_TRASH },
    { position: [6, 5], label: 'Practice reading', type: TileType.CHORE_READING_PRACTICE },
    { position: [7, 1], label: 'Practice reading', type: TileType.CHORE_READING_PRACTICE },
    { position: [4, 4], label: 'Practice reading', type: TileType.CHORE_READING_PRACTICE },
  ],
};

export const GRID_SIZE = WORLD_DEFINITION.size;

export const TILE_COLORS: { [key in TileType]: string } = {
  [TileType.EMPTY]: 'bg-[#141519]',
  [TileType.WALL]: 'bg-[#1f2229]',
  [TileType.KID]: 'bg-[#247feb]/30',
  [TileType.ICE_CREAM]: 'bg-[#fcd34d]/40',
  [TileType.TV]: 'bg-[#ff4d4f]/30',
  [TileType.FRIENDS]: 'bg-[#ff4d4f]/30',
  [TileType.PLAYGROUND]: 'bg-[#ff4d4f]/30',
  [TileType.HOMEWORK]: 'bg-[#8b5cf6]/30',
  [TileType.CHORE]: 'bg-[#3b82f6]/25',
  [TileType.CHORE_FEED_DOG]: 'bg-[#3b82f6]/25',
  [TileType.CHORE_CLEAN_ROOM]: 'bg-[#3b82f6]/25',
  [TileType.CHORE_TAKE_OUT_TRASH]: 'bg-[#3b82f6]/25',
  [TileType.CHORE_READING_PRACTICE]: 'bg-[#3b82f6]/25',
};

export const TILE_EMOJIS: { [key in TileType]?: string } = {
  [TileType.KID]: '🧒',
  [TileType.ICE_CREAM]: '🍦',
  [TileType.TV]: '📺',
  [TileType.FRIENDS]: '🧑‍🤝‍🧑',
  [TileType.PLAYGROUND]: '🛝',
  [TileType.HOMEWORK]: '📚',
  [TileType.CHORE]: '🧹',
  [TileType.CHORE_FEED_DOG]: '🐕',
  [TileType.CHORE_CLEAN_ROOM]: '🧺',
  [TileType.CHORE_TAKE_OUT_TRASH]: '🗑️',
  [TileType.CHORE_READING_PRACTICE]: '📖',
};


export const ACTION_MAP: { [key in Action]: [number, number] } = {
  [Action.UP]: [-1, 0],
  [Action.DOWN]: [1, 0],
  [Action.LEFT]: [0, -1],
  [Action.RIGHT]: [0, 1],
};

export const ACTIONS = [Action.UP, Action.DOWN, Action.LEFT, Action.RIGHT];

export const DISTRACTION_TYPES: Record<DistractionKey, DistractionTypeConfig> = {
  TV: { label: 'Watch TV', funReward: 12, timePenalty: 3, energyBoost: 1 },
  FRIENDS: { label: 'Play with friends', funReward: 8, timePenalty: 2, energyBoost: 3 },
  PLAYGROUND: { label: 'Go to the playground', funReward: 5, timePenalty: 1, energyBoost: 4 },
};

export const DISTRACTION_EMOJIS: Record<DistractionKey, string> = {
  TV: '📺',
  FRIENDS: '🧑‍🤝‍🧑',
  PLAYGROUND: '🛝',
};

export const DISTRACTION_TILE_TYPES: Record<DistractionKey, TileType> = {
  TV: TileType.TV,
  FRIENDS: TileType.FRIENDS,
  PLAYGROUND: TileType.PLAYGROUND,
};

export const TILE_TO_DISTRACTION: Partial<Record<TileType, DistractionKey>> = {
  [TileType.TV]: 'TV',
  [TileType.FRIENDS]: 'FRIENDS',
  [TileType.PLAYGROUND]: 'PLAYGROUND',
};

export const DISTRACTION_LAYOUT: Record<string, DistractionKey> = WORLD_DEFINITION.funSpots.reduce((map, spot) => {
  map[`${spot.position[0]},${spot.position[1]}`] = spot.type;
  return map;
}, {} as Record<string, DistractionKey>);

export const CHORE_ASSIGNMENTS: Record<string, string> = WORLD_DEFINITION.chores.reduce((map, chore) => {
  map[`${chore.position[0]},${chore.position[1]}`] = chore.label;
  return map;
}, {} as Record<string, string>);

export const CHORE_TILE_TYPES: ChoreTileType[] = [
  TileType.CHORE,
  TileType.CHORE_FEED_DOG,
  TileType.CHORE_CLEAN_ROOM,
  TileType.CHORE_TAKE_OUT_TRASH,
  TileType.CHORE_READING_PRACTICE,
  TileType.HOMEWORK,
];
export const CHORE_TILE_SET = new Set<ChoreTileType>(CHORE_TILE_TYPES);

export const INITIAL_REWARDS: RewardsConfig = {
    goal: 100,
    step: -1,
    failure: -100,
    distractionBonus: 5,
    choreReward: 10,
    revisitPenalty: -1,
    earlyIceCreamPenalty: -25,
    bedtimeFailure: -100,
    meltdownFailure: -100,
};

export const CONFIG: Config = {
  learningRate: 0.1,
  discountFactor: 0.99,
  epsilon: 1.0,
  epsilonDecay: 0.9995,
  minEpsilon: 0.01,
  episodes: 2000,
  episodeHardCap: 200,
  speed: 50, // ms per episode when visualizing
  timeLimit: 35,
  timeCostPerMove: 1,
  choreTimeBonus: 4,
  requiredChores: 3,
  timeBucketSize: 4,
  funRewardScale: 1,
  energy: 30,
  energyMoveCost: 1,
  choreEnergyCost: 2,
  energyBucketSize: 3,
  distractionTypes: DISTRACTION_TYPES,
  distractionLayout: DISTRACTION_LAYOUT,
  defaultDistractionType: 'PLAYGROUND',
  choreAssignments: CHORE_ASSIGNMENTS,
  rewards: INITIAL_REWARDS
};

export function createInitialGrid(): TileType[][] {
    const size = WORLD_DEFINITION.size;
    const grid = Array(size).fill(null).map(() => Array(size).fill(TileType.EMPTY));

    for (let i = 0; i < size; i++) {
        grid[0][i] = TileType.WALL;
        grid[size - 1][i] = TileType.WALL;
        grid[i][0] = TileType.WALL;
        grid[i][size - 1] = TileType.WALL;
    }

    const place = (pos: State, tile: TileType) => {
      grid[pos[0]][pos[1]] = tile;
    };

    place(WORLD_DEFINITION.kidStart, TileType.KID);
    place(WORLD_DEFINITION.iceCream, TileType.ICE_CREAM);
    WORLD_DEFINITION.chores.forEach(chore => place(chore.position, chore.type));
    const defaultFunTile = DISTRACTION_TILE_TYPES[CONFIG.defaultDistractionType] ?? TileType.PLAYGROUND;
    WORLD_DEFINITION.funSpots.forEach(fun => {
      const tile = DISTRACTION_TILE_TYPES[fun.type] ?? defaultFunTile;
      place(fun.position, tile);
    });
    WORLD_DEFINITION.walls.forEach(wall => place(wall, TileType.WALL));

    return grid;
}
