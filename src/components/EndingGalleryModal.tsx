import React, { useState } from 'react';
import { GAME_ENDINGS } from '../data/characters';
import { GameEnding } from '../types/game';
import { X, Trophy, Lock, CheckCircle2, BookOpen, Sparkles } from 'lucide-react';

interface EndingGalleryModalProps {
  onClose: () => void;
  unlockedEndingIds: string[];
}

export const EndingGalleryModal: React.FC<EndingGalleryModalProps> = ({
  onClose,
  unlockedEndingIds,
}) => {
  const [selectedEnding, setSelectedEnding] = useState<GameEnding | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'yanchen' | 'yuchi'>('all');

  const filteredEndings = GAME_ENDINGS.filter(e => {
    if (activeFilter === 'yanchen') return e.characterId === 'yanchen';
    if (activeFilter === 'yuchi') return e.characterId === 'yuchi';
    return true;
  });

  const unlockedCount = GAME_ENDINGS.filter(e => unlockedEndingIds.includes(e.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-base text-zinc-100">
              心防结局与宿命回廊 (Ending Archives · {unlockedCount}/{GAME_ENDINGS.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => { setActiveFilter('all'); setSelectedEnding(null); }}
            className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all border-b-2 ${
              activeFilter === 'all'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            全部结局 ({GAME_ENDINGS.length})
          </button>
          <button
            onClick={() => { setActiveFilter('yanchen'); setSelectedEnding(null); }}
            className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all border-b-2 ${
              activeFilter === 'yanchen'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            裴宴臣篇 (3)
          </button>
          <button
            onClick={() => { setActiveFilter('yuchi'); setSelectedEnding(null); }}
            className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all border-b-2 ${
              activeFilter === 'yuchi'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            裴予迟篇 (3)
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!selectedEnding ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredEndings.map((ending) => {
                const isUnlocked = unlockedEndingIds.includes(ending.id);

                return (
                  <div
                    key={ending.id}
                    onClick={() => isUnlocked && setSelectedEnding(ending)}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                      isUnlocked
                        ? 'bg-zinc-900/80 border-rose-500/40 hover:border-rose-400 hover:bg-zinc-800/90 cursor-pointer shadow-lg'
                        : 'bg-zinc-950/40 border-zinc-900 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                          isUnlocked ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {ending.tag}
                        </span>
                        {isUnlocked ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 已达成
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-xs flex items-center gap-1 font-mono">
                            <Lock className="w-3.5 h-3.5" /> 未解锁
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif font-black text-sm text-zinc-100 mt-2">
                        {ending.title}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {isUnlocked ? ending.summary : '该宿命分支尚未被你触发。请在诊疗中提升评级或尝试不同心理对话抉择。'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                      {isUnlocked ? (
                        <span className="text-rose-400 font-medium">点击重温完整剧情回放 →</span>
                      ) : (
                        <span className="text-zinc-400 font-mono text-[10px]">达成要求：{ending.conditionDescription}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Selected Ending Replay View */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-mono text-rose-400 font-bold uppercase">{selectedEnding.tag}</span>
                  <h3 className="text-xl font-serif font-black text-white">{selectedEnding.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedEnding(null)}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700"
                >
                  返回列表
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
                <span className="font-bold text-rose-300">分支总述：</span>
                <span>{selectedEnding.summary}</span>
              </div>

              {/* Epilogue Dialogue Stream */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-serif font-bold text-zinc-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>终局剧情演出</span>
                </div>

                {selectedEnding.epilogueLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border ${
                      line.speaker === '陆星河'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-zinc-900/80 border-zinc-800'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1 ${line.speaker === '陆星河' ? 'text-rose-400' : 'text-sky-400'}`}>
                      {line.speaker}：
                    </div>
                    <p className="text-xs text-zinc-200 font-serif leading-relaxed">
                      {line.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
