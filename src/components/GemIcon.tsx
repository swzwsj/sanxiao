import React from 'react';
import { GemType, SpecialType } from '../types/game';
import { Bomb, Eye, Link2 } from 'lucide-react';

interface GemIconProps {
  type: GemType;
  special?: SpecialType;
  locked?: boolean;
  fireCountdown?: number;
  size?: number;
}

export const GemIcon: React.FC<GemIconProps> = ({
  type,
  special = 'none',
  locked = false,
  fireCountdown,
  size = 46,
}) => {
  const getColors = () => {
    switch (type) {
      case 'seduction':
        return {
          from: '#f43f5e',
          to: '#881337',
          border: '#fda4af',
          glow: 'rgba(244, 63, 94, 0.6)',
          symbol: '♥',
          label: '诱惑',
        };
      case 'hypnosis':
        return {
          from: '#0ea5e9',
          to: '#0369a1',
          border: '#7dd3fc',
          glow: 'rgba(14, 165, 233, 0.6)',
          symbol: '◎',
          label: '催眠',
        };
      case 'empathy':
        return {
          from: '#10b981',
          to: '#064e3b',
          border: '#6ee7b7',
          glow: 'rgba(16, 185, 129, 0.6)',
          symbol: '✦',
          label: '伪装',
        };
      case 'desire':
        return {
          from: '#f59e0b',
          to: '#78350f',
          border: '#fde68a',
          glow: 'rgba(245, 158, 11, 0.6)',
          symbol: '◆',
          label: '欲望',
        };
      case 'trauma':
        return {
          from: '#a855f7',
          to: '#581c87',
          border: '#d8b4fe',
          glow: 'rgba(168, 85, 247, 0.6)',
          symbol: '▲',
          label: '创伤',
        };
    }
  };

  const c = getColors();

  return (
    <div
      className="relative flex items-center justify-center rounded-xl transition-all duration-150 select-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${c.border} 0%, ${c.from} 45%, ${c.to} 100%)`,
        boxShadow: special !== 'none'
          ? `0 0 16px 4px ${c.glow}, inset 0 2px 4px rgba(255,255,255,0.6)`
          : `0 4px 10px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.4)`,
        border: special !== 'none' ? `2px solid ${c.border}` : `1px solid rgba(255,255,255,0.25)`,
      }}
    >
      {/* Specular highlight */}
      <div className="absolute top-1 left-1.5 w-3.5 h-1.5 rounded-full bg-white/40 pointer-events-none transform -rotate-12" />

      {/* Central Symbol */}
      <span className="font-serif font-black text-white/95 text-lg drop-shadow-md select-none pointer-events-none">
        {special === 'eye' ? <Eye size={21} strokeWidth={2.2} /> : special === 'bomb' ? <Bomb size={21} strokeWidth={2.2} /> : c.symbol}
      </span>

      {/* Special indicator lasers */}
      {special === 'line_h' && (
        <div className="absolute inset-x-0 h-1 bg-white pointer-events-none rounded-full" />
      )}
      {special === 'line_v' && (
        <div className="absolute inset-y-0 w-1 bg-white pointer-events-none rounded-full" />
      )}
      {special === 'bomb' && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-amber-300 pointer-events-none opacity-80" />
      )}
      {special === 'eye' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-pink-500/30 to-purple-500/30 pointer-events-none" />
      )}

      {/* Locked Chain Overlay */}
      {locked && (
        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center border-2 border-red-500/70 z-10 pointer-events-none backdrop-blur-[1px]">
          <Link2 size={23} aria-label="心结死锁：需邻近消除解锁" />
        </div>
      )}

      {/* Fire countdown overlay */}
      {typeof fireCountdown === 'number' && (
        <div className="absolute -top-1 -right-1 bg-red-600 text-white font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-amber-300 z-10 pointer-events-none">
          {fireCountdown}
        </div>
      )}
    </div>
  );
};
