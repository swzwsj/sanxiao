import React from 'react';
import { PlayerSkill } from '../types/game';
import { PLAYER_SKILLS } from '../data/characters';
import { Flame, Zap, Eye, HeartCrack, Sparkles, Shield } from 'lucide-react';

interface SkillsBarProps {
  currentSp: number;
  maxSp: number;
  onCastSkill: (skill: PlayerSkill) => void;
  isProcessing: boolean;
  composure: number;
  maxComposure: number;
}

export const SkillsBar: React.FC<SkillsBarProps> = ({
  currentSp,
  maxSp,
  onCastSkill,
  isProcessing,
  composure,
  maxComposure,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-300 group-hover:scale-115 transition-transform drop-shadow-[0_0_8px_#f43f5e]" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-300 group-hover:scale-115 transition-transform drop-shadow-[0_0_8px_#f59e0b]" />;
      case 'Eye':
        return <Eye className="w-5 h-5 text-sky-300 group-hover:scale-115 transition-transform drop-shadow-[0_0_8px_#38bdf8]" />;
      case 'HeartCrack':
        return <HeartCrack className="w-5 h-5 text-pink-300 group-hover:scale-115 transition-transform drop-shadow-[0_0_8px_#ec4899]" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-300 group-hover:scale-115 transition-transform drop-shadow-[0_0_8px_#c084fc]" />;
    }
  };

  const getOrbGradient = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return 'from-rose-950 via-rose-900 to-black border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
      case 'Zap':
        return 'from-amber-950 via-amber-900 to-black border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
      case 'Eye':
        return 'from-sky-950 via-sky-900 to-black border-sky-500/70 shadow-[0_0_15px_rgba(56,189,248,0.4)]';
      case 'HeartCrack':
        return 'from-pink-950 via-pink-900 to-black border-pink-500/70 shadow-[0_0_15px_rgba(236,72,153,0.4)]';
      default:
        return 'from-purple-950 via-purple-900 to-black border-purple-500/70 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
    }
  };

  const composureRatio = Math.max(0, Math.min(1, composure / maxComposure));
  const spRatio = Math.max(0, Math.min(1, currentSp / maxSp));

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-md">
      {/* Steam Mirror Style Bottom-Left Heroine Circular Avatar & Radial Arc (from image_29aa90a6.png) */}
      <div className="relative flex items-center justify-center shrink-0">
        {/* Circular SVG Radial Arc */}
        <svg className="w-16 h-16 sm:w-18 sm:h-18 -rotate-90">
          <circle
            cx="34"
            cy="34"
            r="30"
            className="stroke-zinc-800/80 fill-none"
            strokeWidth="4"
          />
          <circle
            cx="34"
            cy="34"
            r="30"
            className="stroke-red-500 fill-none transition-all duration-300"
            strokeWidth="4"
            strokeDasharray={188.5}
            strokeDashoffset={188.5 * (1 - composureRatio)}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))',
            }}
          />
        </svg>

        {/* Circular Avatar Portrait */}
        <div className="absolute w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden border-2 border-zinc-700 shadow-inner bg-zinc-900">
          <img
            src="/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg"
            alt="陆星河"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Radial Percentage Badges: 100% and 0% labels like Steam Mirror */}
        <span className="absolute -bottom-1 -left-2 text-[8px] font-mono font-bold text-zinc-400">
          {Math.round(composureRatio * 100)}%
        </span>
        <span className="absolute -bottom-1 -right-2 text-[8px] font-mono font-bold text-amber-400">
          {currentSp}SP
        </span>
      </div>

      {/* Steam Mirror Style: Row of Circular Skill / Item Orbs (from image_29aa90a6.png) */}
      <div className="flex-1 flex items-center justify-start gap-2.5 sm:gap-3.5 overflow-x-auto py-1">
        {PLAYER_SKILLS.map((skill) => {
          const canCast = currentSp >= skill.spCost && !isProcessing;

          return (
            <button
              key={skill.id}
              onClick={() => onCastSkill(skill)}
              disabled={!canCast}
              className={`group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                canCast
                  ? 'hover:scale-110 active:scale-95'
                  : 'opacity-40 cursor-not-allowed filter grayscale'
              }`}
              title={`${skill.name} (${skill.spCost} SP): ${skill.description}`}
            >
              {/* Circular Orb */}
              <div
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br border-2 flex items-center justify-center transition-all ${
                  canCast
                    ? getOrbGradient(skill.iconName)
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {getIcon(skill.iconName)}

                {/* SP Cost Badge */}
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-zinc-950 border border-amber-400/80 text-[9px] font-mono font-bold text-amber-300 shadow-md">
                  {skill.spCost}
                </div>
              </div>

              {/* Skill Name */}
              <span className="text-[10px] font-medium text-zinc-300 group-hover:text-white mt-1 whitespace-nowrap">
                {skill.name}
              </span>

              {/* Hover Tooltip */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-xl bg-zinc-900/95 border border-zinc-700 shadow-2xl z-30 pointer-events-none backdrop-blur-md text-center">
                <div className="text-[10px] text-rose-400 font-serif italic mb-0.5">
                  {skill.flavor}
                </div>
                <div className="text-[10px] text-zinc-300 leading-tight">
                  {skill.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* SP Gauge Bar */}
      <div className="hidden md:flex flex-col gap-1 w-28 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-amber-400 flex items-center gap-1 font-bold">
            <Sparkles className="w-3 h-3" />
            <span>SP</span>
          </span>
          <span className="text-zinc-300">
            {currentSp}/{maxSp}
          </span>
        </div>
        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
            style={{ width: `${spRatio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
