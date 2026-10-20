import React, { useState, useEffect } from 'react';
import { CrisisChoice, CrisisEvent } from '../types/game';
import { Timer, Sparkles, ShieldAlert } from 'lucide-react';

interface CrisisEventModalProps {
  event: CrisisEvent;
  onResolve: (choice?: CrisisChoice, timedOut?: boolean) => void;
}

export const CrisisEventModal: React.FC<CrisisEventModalProps> = ({
  event,
  onResolve,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(event.timeLimitSeconds);
  const [selectedChoice, setSelectedChoice] = useState<CrisisChoice | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    if (isResolved) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setIsResolved(true);
          onResolve(undefined, true);
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isResolved, onResolve]);

  const handleSelect = (choice: CrisisChoice) => {
    if (isResolved) return;
    setIsResolved(true);
    setSelectedChoice(choice);
    setTimeout(() => {
      onResolve(choice, false);
    }, 1200);
  };

  const timeRatio = Math.max(0, secondsLeft / event.timeLimitSeconds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border-2 border-red-500/70 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.4)] overflow-hidden flex flex-col">
        {/* Top Urgent Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-red-950/80 via-zinc-900 to-red-950/80 border-b border-red-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
            <span className="font-serif font-black text-sm text-red-200 tracking-wide uppercase">
              {event.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-red-400">
            <Timer className="w-4 h-4 animate-spin" />
            <span>{secondsLeft.toFixed(1)}s</span>
          </div>
        </div>

        {/* Real-time Countdown Gauge */}
        <div className="w-full h-1.5 bg-zinc-900">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-rose-500 transition-all duration-100 ease-linear"
            style={{ width: `${timeRatio * 100}%` }}
          />
        </div>

        {/* Situation Description & Target Dialogue */}
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans">
            {event.situation}
          </div>

          {/* Target's Emotional Attack Quote with Portrait */}
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 relative flex items-start gap-3.5">
            <div className="relative w-12 h-14 rounded-lg overflow-hidden border border-red-500/60 shrink-0 bg-zinc-950 shadow-md">
              <img
                src={
                  event.speakerName.includes('予迟')
                    ? '/assets/aistudio/ff5b0d44690e58b29adf27c2e1c5ec53_edd7ce8f.jpg'
                    : '/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg'
                }
                alt={event.speakerName}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-red-400 mb-1 flex items-center gap-1">
                <span>{event.speakerName} · 情绪失控爆发</span>
              </div>
              <p className="text-sm font-serif font-black text-white italic leading-relaxed">
                {event.targetQuote}
              </p>
            </div>
          </div>

          {/* Quick Response Choices (Must click within seconds) */}
          {!selectedChoice ? (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-serif font-bold text-rose-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>陆星河的即时应对攻心策略：</span>
              </div>

              <div className="grid gap-2">
                {event.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(choice)}
                    className="p-3 rounded-xl text-left bg-zinc-900/90 border border-zinc-700/80 hover:border-rose-500 hover:bg-zinc-800/90 transition-all group flex flex-col justify-between"
                  >
                    <div className="text-xs font-serif font-bold text-zinc-100 group-hover:text-rose-300 transition-colors">
                      {choice.text}
                    </div>
                    <div className="text-[11px] text-amber-300 mt-1 flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400">战术收益:</span>
                      <span>{choice.effectDesc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Selected reaction preview */
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2 animate-in fade-in">
              <div className="text-xs font-bold text-rose-300">
                攻心策略生效！男主反应：
              </div>
              <p className="text-sm font-serif italic text-zinc-100">
                “{selectedChoice.reaction}”
              </p>
              <div className="text-xs font-mono font-bold text-emerald-400">
                已获得加成：{selectedChoice.effectDesc}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
