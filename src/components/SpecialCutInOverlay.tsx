import React from 'react';
import { SpecialCutIn } from '../types/game';
import { Sparkles, Zap, Flame } from 'lucide-react';

interface SpecialCutInOverlayProps {
  cutIn: SpecialCutIn | null;
}

export const SpecialCutInOverlay: React.FC<SpecialCutInOverlayProps> = ({ cutIn }) => {
  if (!cutIn) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Dark dynamic slash banner */}
      <div className="relative w-full py-4 bg-gradient-to-r from-transparent via-black/95 to-transparent border-y-2 border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.6)] backdrop-blur-md transform -rotate-1 flex items-center justify-center">
        {/* Shimmer light beam */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent animate-pulse" />

        <div className="max-w-3xl w-full px-6 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{cutIn.title}</span>
              </span>
              <span className="text-zinc-400 text-xs font-serif">{cutIn.subtitle}</span>
            </div>
            <p className="text-base sm:text-lg font-serif font-black text-white italic drop-shadow-lg">
              “{cutIn.dialogQuote}”
            </p>
          </div>

          <div className="text-right shrink-0 ml-4">
            <div className="text-[10px] text-zinc-400 font-mono uppercase">CRITICAL CASCADE</div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-bounce">
              {cutIn.multiplierText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
