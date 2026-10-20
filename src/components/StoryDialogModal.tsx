import React, { useState } from 'react';
import { DialogChoice, DialogScene } from '../types/game';
import { Sparkles, ArrowRight, Check } from 'lucide-react';

interface StoryDialogModalProps {
  scene: DialogScene;
  onComplete: (chosenBuff?: DialogChoice) => void;
  title: string;
}

export const StoryDialogModal: React.FC<StoryDialogModalProps> = ({
  scene,
  onComplete,
  title,
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<DialogChoice | null>(null);
  const [showChoiceResult, setShowChoiceResult] = useState(false);

  const currentLine = scene.lines[currentLineIndex];
  const isLastLine = currentLineIndex >= scene.lines.length - 1;
  const hasChoice = scene.choice && isLastLine;

  const handleNext = () => {
    if (!isLastLine) {
      setCurrentLineIndex(prev => prev + 1);
    } else if (!hasChoice) {
      onComplete();
    }
  };

  const handleSelectOption = (choice: DialogChoice) => {
    setSelectedChoice(choice);
    setShowChoiceResult(true);
  };

  const handleConfirmChoice = () => {
    if (selectedChoice) {
      onComplete(selectedChoice);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="font-serif font-bold text-sm text-zinc-100 tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={() => onComplete()}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            快速跳过
          </button>
        </div>

        {/* Visual Novel Theater Frame */}
        <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
          {/* Speaker Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  currentLine.speaker === 'lu_xinghe'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    : currentLine.speaker === 'target'
                    ? 'bg-sky-950/80 text-sky-300 border border-sky-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {currentLine.speaker === 'lu_xinghe'
                  ? '陆星河 (主治医师)'
                  : scene.characterName}
              </span>
            </div>

            {/* Main Dialogue Speech with Artwork Avatar */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 shadow-inner min-h-[90px] flex items-center gap-3.5">
              <div className="relative w-14 sm:w-16 h-16 sm:h-20 rounded-xl overflow-hidden border border-rose-500/50 shrink-0 bg-zinc-950 shadow-md">
                <img
                  src={
                    currentLine.speaker === 'lu_xinghe'
                      ? '/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg'
                      : scene.characterName.includes('予迟')
                      ? '/assets/aistudio/ff5b0d44690e58b29adf27c2e1c5ec53_edd7ce8f.jpg'
                      : '/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg'
                  }
                  alt="人物立绘肖像"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <p className="flex-1 text-sm sm:text-base text-zinc-100 font-serif leading-relaxed tracking-wide">
                {currentLine.text}
              </p>
            </div>
          </div>

          {/* Interactive Choices Section (If at the climax of the intro dialog) */}
          {hasChoice && !showChoiceResult && (
            <div className="space-y-3 my-2 pt-2 border-t border-zinc-800 animate-in fade-in duration-300">
              <div className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{scene.choice!.prompt}</span>
              </div>

              <div className="grid gap-2">
                {scene.choice!.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className="p-3 text-left rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-rose-500/80 hover:bg-zinc-800 transition-all group"
                  >
                    <div className="font-serif text-sm text-zinc-100 group-hover:text-rose-300 transition-colors">
                      {opt.text}
                    </div>
                    <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                      <span>战术加成:</span>
                      <span className="font-medium text-amber-300">{opt.mindgameEffect}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Choice Reaction Display */}
          {showChoiceResult && selectedChoice && (
            <div className="my-2 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 animate-in fade-in">
              <div className="text-xs font-semibold text-rose-300">
                心理操控反馈：
              </div>
              <p className="text-sm text-zinc-200 italic font-serif">
                {selectedChoice.reaction}
              </p>
              <div className="text-xs font-mono font-bold text-amber-300">
                已激活战场增益：{selectedChoice.mindgameEffect}
              </div>
            </div>
          )}

          {/* Bottom Next / Proceed Controls */}
          <div className="mt-4 flex items-center justify-end">
            {!hasChoice ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-colors shadow-lg shadow-rose-900/30"
              >
                <span>{isLastLine ? '开始心理拆解' : '继续'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : showChoiceResult ? (
              <button
                onClick={handleConfirmChoice}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-rose-900/40"
              >
                <Check className="w-4 h-4" />
                <span>进入诊疗对决</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
