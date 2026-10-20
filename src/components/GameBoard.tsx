import React, { useState, useEffect, useRef } from 'react';
import { Grid, Position, GemType } from '../types/game';
import { GemIcon } from './GemIcon';
import { Lightbulb, Flame, Zap, Sparkles } from 'lucide-react';

interface DynamicParticle {
  id: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  dx: number; // displacement in px
  dy: number;
  color: string;
  size: number;
  shape: 'star' | 'circle' | 'shard' | 'ring';
  rotation: number;
}

interface GameBoardProps {
  grid: Grid;
  selectedPos: Position | null;
  onSelectPos: (pos: Position) => void;
  onSwap: (from: Position, to: Position) => void;
  isProcessing: boolean;
  onHint: () => void;
  hintPositions: Position[] | null;
  comboCount: number;
  lastMultiplier: number;
  bonusTitle: string;
}

const GEM_BURST_COLORS: Record<GemType, string[]> = {
  seduction: ['#f43f5e', '#fb7185', '#fda4af', '#be123c'],
  hypnosis: ['#818cf8', '#a78bfa', '#c084fc', '#4f46e5'],
  empathy: ['#2dd4bf', '#34d399', '#6ee7b7', '#059669'],
  desire: ['#fbbf24', '#f59e0b', '#fde047', '#d97706'],
  trauma: ['#ef4444', '#dc2626', '#f87171', '#991b1b'],
};

export const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  selectedPos,
  onSelectPos,
  onSwap,
  isProcessing,
  onHint,
  hintPositions,
  comboCount,
  lastMultiplier,
  bonusTitle,
}) => {
  const [shakePos, setShakePos] = useState<Position | null>(null);
  const [draggedPos, setDraggedPos] = useState<Position | null>(null);
  const [activeParticles, setActiveParticles] = useState<DynamicParticle[]>([]);
  const prevMatchingKeyRef = useRef<string>('');

  // Detect matching gems and spawn dynamic burst particles at eliminated gem positions
  useEffect(() => {
    const matchingGems: { row: number; col: number; type: GemType; special?: string }[] = [];
    grid.forEach((row, r) => {
      row.forEach((gem, c) => {
        if (gem?.isMatching) {
          matchingGems.push({ row: r, col: c, type: gem.type, special: gem.special });
        }
      });
    });

    if (matchingGems.length === 0) return;

    const currentKey = matchingGems.map(g => `${g.row},${g.col}`).join('|');
    if (currentKey === prevMatchingKeyRef.current) return;
    prevMatchingKeyRef.current = currentKey;

    const newParticles: DynamicParticle[] = [];
    const isHighCombo = comboCount >= 3;
    const particleCountPerGem = isHighCombo ? 14 : 8;

    matchingGems.forEach(gem => {
      const centerX = ((gem.col + 0.5) / 7) * 100;
      const centerY = ((gem.row + 0.5) / 7) * 100;
      const palette = GEM_BURST_COLORS[gem.type] || ['#fbbf24', '#f43f5e', '#ffffff'];

      // Add central shockwave ring for high combo
      if (isHighCombo) {
        newParticles.push({
          id: `ring_${gem.row}_${gem.col}_${Date.now()}_${Math.random()}`,
          x: centerX,
          y: centerY,
          dx: 0,
          dy: 0,
          color: palette[0],
          size: 48,
          shape: 'ring',
          rotation: 0,
        });
      }

      for (let i = 0; i < particleCountPerGem; i++) {
        const angle = (Math.PI * 2 * i) / particleCountPerGem + (Math.random() - 0.5) * 0.4;
        const speed = isHighCombo ? 35 + Math.random() * 45 : 20 + Math.random() * 30;
        const color = isHighCombo && Math.random() > 0.6 ? '#fbbf24' : palette[i % palette.length];
        const shape = isHighCombo && i % 2 === 0 ? 'star' : i % 3 === 0 ? 'shard' : 'circle';

        newParticles.push({
          id: `p_${gem.row}_${gem.col}_${i}_${Date.now()}_${Math.random()}`,
          x: centerX,
          y: centerY,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color,
          size: isHighCombo ? 6 + Math.random() * 6 : 4 + Math.random() * 4,
          shape,
          rotation: Math.random() * 360,
        });
      }
    });

    setActiveParticles(prev => [...prev.slice(-30), ...newParticles]);

    const timer = setTimeout(() => {
      setActiveParticles([]);
    }, 600);

    return () => clearTimeout(timer);
  }, [grid, comboCount]);

  const handleTileClick = (row: number, col: number) => {
    if (isProcessing) return;

    const clickedGem = grid[row]?.[col];
    if (clickedGem?.locked) {
      setShakePos({ row, col });
      setTimeout(() => setShakePos(null), 400);
      return;
    }

    if (!selectedPos) {
      onSelectPos({ row, col });
      return;
    }

    if (selectedPos.row === row && selectedPos.col === col) {
      onSelectPos({ row: -1, col: -1 });
      return;
    }

    const prevGem = grid[selectedPos.row]?.[selectedPos.col];
    if (prevGem?.locked) {
      onSelectPos({ row: -1, col: -1 });
      return;
    }

    onSwap(selectedPos, { row, col });
  };

  const handleDragStart = (e: React.DragEvent, row: number, col: number) => {
    if (isProcessing) return;
    const gem = grid[row]?.[col];
    if (gem?.locked) {
      e.preventDefault();
      return;
    }
    setDraggedPos({ row, col });
    e.dataTransfer.setData('text/plain', `${row},${col}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    if (isProcessing || !draggedPos) return;

    const targetGem = grid[targetRow]?.[targetCol];
    if (targetGem?.locked) {
      setShakePos({ row: targetRow, col: targetCol });
      setTimeout(() => setShakePos(null), 400);
      setDraggedPos(null);
      return;
    }

    if (draggedPos.row !== targetRow || draggedPos.col !== targetCol) {
      onSwap(draggedPos, { row: targetRow, col: targetCol });
    }
    setDraggedPos(null);
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-md">
      {/* Top Banner: Combo Cascade Real-Time Feedback (Iconic Steam Mirror Style) */}
      <div className="w-full flex items-center justify-between px-2 mb-2 min-h-[40px]">
        <div className="flex items-center gap-2">
          {comboCount > 1 ? (
            <div className="flex items-center gap-2 animate-in zoom-in-95 duration-150">
              <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-serif font-black text-sm tracking-wide shadow-[0_0_20px_rgba(244,63,94,0.6)] flex items-center gap-1.5 animate-bounce">
                <Flame className="w-4 h-4 text-amber-200" />
                <span>COMBO x{comboCount}</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 font-mono shadow-sm flex items-center gap-1">
                <span>{bonusTitle}</span>
                <span className="text-amber-400 font-bold">({lastMultiplier.toFixed(1)}x)</span>
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 flex items-center gap-2 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>1消=🛡️1 · 连消=🛡️+1 · 连锁=⚡x2~x3</span>
            </div>
          )}
        </div>

        {/* Action button: Hint */}
        <button
          onClick={onHint}
          disabled={isProcessing}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-amber-300 hover:border-amber-500/60 transition-all disabled:opacity-40 shadow-sm shrink-0 active:scale-95 cursor-pointer"
          title="心理洞察提示"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium hidden sm:inline">洞察</span>
        </button>
      </div>

      {/* Grid Container (Mirror Beveled Metallic Frame) */}
      <div className="relative p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-4 border-zinc-800/90 shadow-[0_0_30px_rgba(0,0,0,0.95)] ring-1 ring-zinc-700/50 overflow-visible">
        {/* Dynamic Elimination Particle Layer (Overlaying Board) */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
          {activeParticles.map(p => {
            if (p.shape === 'ring') {
              return (
                <div
                  key={p.id}
                  className="absolute rounded-full border-2 border-amber-400 animate-ping pointer-events-none"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    marginLeft: `-${p.size / 2}px`,
                    marginTop: `-${p.size / 2}px`,
                    borderColor: p.color,
                    boxShadow: `0 0 15px ${p.color}`,
                  }}
                />
              );
            }

            return (
              <div
                key={p.id}
                className="absolute pointer-events-none transition-all duration-500 ease-out"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rotation}deg)`,
                  opacity: 0,
                  transitionProperty: 'transform, opacity',
                  transitionDuration: '500ms',
                }}
              >
                {p.shape === 'star' ? (
                  <Sparkles
                    className="animate-spin"
                    style={{
                      width: `${p.size * 1.5}px`,
                      height: `${p.size * 1.5}px`,
                      color: p.color,
                      filter: `drop-shadow(0 0 6px ${p.color})`,
                    }}
                  />
                ) : p.shape === 'shard' ? (
                  <div
                    style={{
                      width: `${p.size * 1.8}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      boxShadow: `0 0 8px ${p.color}`,
                    }}
                  />
                ) : (
                  <div
                    className="rounded-full"
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 7x7 Grid */}
        <div className="grid grid-cols-7 gap-2">
          {grid.map((row, r) =>
            row.map((gem, c) => {
              const isSelected = selectedPos?.row === r && selectedPos?.col === c;
              const isHinted = hintPositions?.some(p => p.row === r && p.col === c);
              const isShaking = shakePos?.row === r && shakePos?.col === c;
              const isMatching = gem?.isMatching;

              return (
                <div
                  key={gem ? gem.id : `empty_${r}_${c}`}
                  onClick={() => handleTileClick(r, c)}
                  draggable={!gem?.locked && !isProcessing}
                  onDragStart={(e) => handleDragStart(e, r, c)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, r, c)}
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-zinc-950 scale-105 z-20 shadow-[0_0_18px_rgba(244,63,94,0.8)]'
                      : 'hover:scale-[1.03] hover:brightness-110 active:scale-95'
                  } ${isHinted ? 'ring-2 ring-amber-400 animate-pulse' : ''} ${
                    isShaking ? 'scale-90 ring-2 ring-red-500 animate-pulse' : ''
                  } ${
                    isMatching
                      ? 'scale-125 brightness-150 ring-4 ring-rose-400/90 drop-shadow-[0_0_25px_#f43f5e] z-30 animate-pulse'
                      : ''
                  }`}
                >
                  {gem && (
                    <GemIcon
                      type={gem.type}
                      special={gem.special}
                      locked={gem.locked}
                      fireCountdown={gem.fireCountdown}
                      size={46}
                    />
                  )}

                  {/* Explosive Elimination Particle Flash */}
                  {isMatching && (
                    <div className="absolute inset-0 rounded-xl bg-white/70 pointer-events-none animate-ping" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
