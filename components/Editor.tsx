import React, { useState } from 'react';
import type { TileType } from '../types';
import { TileType as TileEnum, GRID_SIZE, TILE_COLORS, TILE_EMOJIS } from '../constants';

interface EditorProps {
  grid: TileType[][];
  onGridChange: (newGrid: TileType[][]) => void;
}

const tileTypesToEdit: {name: string, type: TileEnum}[] = [
    { name: 'Empty', type: TileEnum.EMPTY },
    { name: 'Wall', type: TileEnum.WALL },
    { name: 'George', type: TileEnum.KID },
    { name: 'Ice Cream', type: TileEnum.ICE_CREAM },
    { name: 'TV', type: TileEnum.TV },
    { name: 'Friends', type: TileEnum.FRIENDS },
    { name: 'Playground', type: TileEnum.PLAYGROUND },
    { name: 'Homework', type: TileEnum.HOMEWORK },
    { name: 'Feed the dog', type: TileEnum.CHORE_FEED_DOG },
    { name: 'Clean your room', type: TileEnum.CHORE_CLEAN_ROOM },
    { name: 'Take out the trash', type: TileEnum.CHORE_TAKE_OUT_TRASH },
    { name: 'Reading practice', type: TileEnum.CHORE_READING_PRACTICE },
];

const Editor: React.FC<EditorProps> = ({ grid, onGridChange }) => {
  const [selectedTile, setSelectedTile] = useState<TileEnum>(TileEnum.WALL);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleTileClick = (r: number, c: number) => {
    const newGrid = grid.map(row => [...row]);

    // Ensure only one kid and one ice cream shop
    if (selectedTile === TileEnum.KID || selectedTile === TileEnum.ICE_CREAM) {
        for(let i=0; i<GRID_SIZE; i++) {
            for(let j=0; j<GRID_SIZE; j++) {
                if(newGrid[i][j] === selectedTile) {
                    newGrid[i][j] = TileEnum.EMPTY;
                }
            }
        }
    }
    
    newGrid[r][c] = selectedTile;
    onGridChange(newGrid);
  };
  
  const handleMouseEnter = (r: number, c: number) => {
      if (isMouseDown) {
          handleTileClick(r,c);
      }
  }

  return (
    <div className="flex flex-col gap-4">
        <div className="p-4 bg-gray-800 rounded-lg flex items-center justify-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold mr-4">Brush:</h3>
            {tileTypesToEdit.map(({name, type}) => (
                <button
                    key={name}
                    onClick={() => setSelectedTile(type)}
                    className={`px-3 py-2 rounded-md transition-all text-sm flex items-center gap-2 ${selectedTile === type ? 'ring-2 ring-cyan-400 bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                    <span className="text-lg">{TILE_EMOJIS[type]}</span>
                    <span>{name}</span>
                </button>
            ))}
        </div>
        <div 
            className="aspect-square w-full max-w-[70vh] mx-auto bg-gray-900 grid cursor-pointer" 
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
            onMouseDown={() => setIsMouseDown(true)}
            onMouseUp={() => setIsMouseDown(false)}
            onMouseLeave={() => setIsMouseDown(false)}
        >
            {grid.map((row, r) =>
                row.map((tile, c) => (
                    <div
                        key={`${r}-${c}`}
                        onClick={() => handleTileClick(r, c)}
                        onMouseEnter={() => handleMouseEnter(r,c)}
                        className={`w-full h-full ${TILE_COLORS[tile]} border border-gray-700/50 flex items-center justify-center transition-colors hover:bg-gray-500/50 text-2xl`}
                    >
                       {TILE_EMOJIS[tile]}
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default Editor;
