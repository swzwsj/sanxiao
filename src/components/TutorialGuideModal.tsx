import React, { useState } from 'react';
import { TUTORIAL_STEPS } from '../data/characters';
import { GemIcon } from './GemIcon';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Timer, Shield, Zap, BookOpen } from 'lucide-react';

interface TutorialGuideModalProps {
  onClose: () => void;
}

export const TutorialGuideModal: React.FC<TutorialGuideModalProps> = ({ onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[currentStepIndex];
  const totalSteps = TUTORIAL_STEPS.length;
  const isLast = currentStepIndex === totalSteps - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      localStorage.setItem('mind_break_tutorial_seen', 'true');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-rose-500/40 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-rose-400" />
            <h3 className="font-serif font-bold text-base text-zinc-100">
              执网者新晋医师指南 · 深度教程 ({currentStepIndex + 1}/{totalSteps})
            </h3>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('mind_break_tutorial_seen', 'true');
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="flex w-full h-1 bg-zinc-900">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-300 ${
                i <= currentStepIndex ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>步骤 {step.step} · {step.subtitle}</span>
            </div>
            <h2 className="text-xl font-serif font-black text-white">
              {step.title}
            </h2>
          </div>

          {/* Interactive Illustrated Visuals Per Step */}
          {step.step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
                <div className="flex flex-col items-center gap-1">
                  <GemIcon type="seduction" size={38} />
                  <span className="text-[11px] font-bold text-rose-400">绯红·诱惑</span>
                  <span className="text-[10px] text-zinc-400">心防直接打击</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GemIcon type="hypnosis" size={38} />
                  <span className="text-[11px] font-bold text-sky-400">幽蓝·催眠</span>
                  <span className="text-[10px] text-zinc-400">削防+控心</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GemIcon type="empathy" size={38} />
                  <span className="text-[11px] font-bold text-emerald-400">苍翠·伪装</span>
                  <span className="text-[10px] text-zinc-400">回从容度</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GemIcon type="desire" size={38} />
                  <span className="text-[11px] font-bold text-amber-400">纯金·欲望</span>
                  <span className="text-[10px] text-zinc-400">蓄积SP技能</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <GemIcon type="trauma" size={38} />
                  <span className="text-[11px] font-bold text-purple-400">紫幽·创伤</span>
                  <span className="text-[10px] text-zinc-400">流血重伤</span>
                </div>
              </div>
            </div>
          )}

          {step.step === 2 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-emerald-400 font-bold block mb-1">1. 固若金汤 (100%~75%)</span>
                <span className="text-zinc-400 text-[11px]">戒备严密，连锁 1.0x 基础。</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-sky-400 font-bold block mb-1">2. 心理动摇 (75%~50%)</span>
                <span className="text-zinc-400 text-[11px]">神色泛红，连锁 1.3x 起步，弱点撕扯。</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-purple-400 font-bold block mb-1">3. 怨念失控 (50%~25%)</span>
                <span className="text-zinc-400 text-[11px]">防线雪崩，连锁 1.7x，触发反制技能！</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40">
                <span className="text-rose-300 font-bold block mb-1">4. 极乐臣服 (25%~0%)</span>
                <span className="text-zinc-300 text-[11px]">心智失控！倍率飙升至 2.4x~6.0x 绝顶暴击！</span>
              </div>
            </div>
          )}

          {step.step === 3 && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <Timer className="w-4 h-4" />
                <span>限时与惩罚体系</span>
              </div>
              <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
                <li><span className="text-emerald-400 font-medium">消除回时：</span>每次成功消除连锁，减缓时钟流速并回复 <span className="font-mono text-emerald-300">+1.5s ~ +3.5s</span> 时间！</li>
                <li><span className="text-rose-400 font-medium">无效交换惩罚：</span>强行移动无法达成匹配的宝石，直接扣除 <span className="font-mono text-rose-300">-3.0s</span> 时限并削减 5 点医师从容度！</li>
                <li><span className="text-amber-400 font-medium">障碍反噬：</span>未在倒计时内消除心火或心结锁链，将触发巨额自爆扣时！</li>
              </ul>
            </div>
          )}

          {step.step === 4 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-rose-400">移情操纵 (30 SP)</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">将 4 颗宝石同化为绯红诱惑宝石</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-amber-400">创伤回溯 (45 SP)</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">爆破中央 3x3 区域并附加重伤</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-sky-400">极乐催眠 (65 SP)</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">全屏共振消除 12 颗 + 延缓敌方技能</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="font-bold text-pink-400">恶女之吻 (90 SP)</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">真实穿透绝杀，伤害随已损心防飙升</p>
              </div>
            </div>
          )}

          {step.step === 5 && (
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-amber-300">多分支结局达成条件示例</div>
              <div className="text-xs text-zinc-300 space-y-1">
                <div><span className="text-rose-400 font-bold">S 级真支配：</span>剩余时间 ≥ 25 秒，从容度 ≥ 70，开局选择支配倾向选项。</div>
                <div><span className="text-purple-400 font-bold">A 级病娇共狂：</span>完成 5 连击以上大爆发，开局选择拉扯反噬倾向。</div>
                <div><span className="text-blue-400 font-bold">B 级假面决裂：</span>时间濒临耗尽时艰难取胜，男主重拾冷血假面。</div>
              </div>
            </div>
          )}

          {/* Detailed Paragraph Text */}
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            {step.description}
          </p>

          {/* Pro-Tip Box */}
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-amber-300 flex items-start gap-2">
            <span className="font-serif font-black text-amber-400 shrink-0">TIP:</span>
            <span>{step.tip}</span>
          </div>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>上一步</span>
          </button>

          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStepIndex ? 'bg-rose-500 w-4' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950 transition-colors"
          >
            <span>{isLast ? '进入诊疗' : '下一步'}</span>
            {isLast ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
