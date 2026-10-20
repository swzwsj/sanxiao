import React from 'react';
import { X, ShieldAlert, Sparkles, Zap, Flame, Lock, Eye } from 'lucide-react';
import { GemIcon } from './GemIcon';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <h3 className="font-serif font-bold text-base text-zinc-100">
              诊疗机理与破防指南 (Battle Manual)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* Section 1: Core Goal */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <h4 className="font-serif font-bold text-rose-300 text-sm mb-1 flex items-center gap-1.5">
              <span>核心目标：瓦解心防值 (Mind Defense Break)</span>
            </h4>
            <p className="text-xs text-zinc-300">
              你扮演表面高智知性独立、背地里是玩弄人心的极恶疯批心理医生【陆星河】。通过三消策略消除宝石，逐步粉碎裴氏兄弟（表面霸总内心绿茶的哥哥裴宴臣、表面桀骜不羁实则渴望被支配的弟弟裴予迟）的心防值，逼迫他们彻底沦陷臣服。
            </p>
          </div>

          {/* Section 2: 基于心防值的连锁消除加成系统 */}
          <div>
            <h4 className="font-serif font-bold text-zinc-100 text-sm mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>独创机制：心防阶段连锁消除倍率系统</span>
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              男主的心防值越低，其心理弱点暴露越明显，触发的消除伤害与连锁爆发倍率呈指数级飙升：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                  <span>① 固若金汤 (100%~75%)</span>
                  <span>1.0x 基础</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  理智尚存，严密戒备。每次连击递增 +0.25x 伤害。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-sky-400 font-bold mb-1">
                  <span>② 心理动摇 (75%~50%)</span>
                  <span>1.3x 起步</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  心防微裂，神情动摇。连击递增 +0.4x，触发阶段破防台词。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-purple-400 font-bold mb-1">
                  <span>③ 怨念失控 (50%~25%)</span>
                  <span>1.7x 雪崩暴击</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  防线雪崩！连击递增 +0.65x，男主将释放反制技能试图挣扎。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-rose-400 font-bold mb-1">
                  <span>④ 极乐臣服 (25%~0%)</span>
                  <span>2.4x~6.0x 绝顶</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  精神沦陷！全屏进入支配高潮，所有 4 连以上消除引发心智暴击！
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: 5 Psychological Gem Types */}
          <div>
            <h4 className="font-serif font-bold text-zinc-100 text-sm mb-2.5">
              五种心理学宝石属性
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <GemIcon type="seduction" size={36} />
                <div>
                  <div className="font-bold text-rose-400">绯红·诱惑 (Seduction)</div>
                  <div className="text-[11px] text-zinc-400">直接心防打击，暴击伤害最高</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <GemIcon type="hypnosis" size={36} />
                <div>
                  <div className="font-bold text-sky-400">幽蓝·催眠 (Hypnosis)</div>
                  <div className="text-[11px] text-zinc-400">削减心防并深化催眠深度</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <GemIcon type="empathy" size={36} />
                <div>
                  <div className="font-bold text-emerald-400">苍翠·伪装 (Empathy)</div>
                  <div className="text-[11px] text-zinc-400">恢复陆医师从容度，抵抗反噬</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <GemIcon type="desire" size={36} />
                <div>
                  <div className="font-bold text-amber-400">纯金·欲望 (Desire)</div>
                  <div className="text-[11px] text-zinc-400">积累支配值 SP，施展主动诊疗技能</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 sm:col-span-2">
                <GemIcon type="trauma" size={36} />
                <div>
                  <div className="font-bold text-purple-400">紫幽·创伤 (Trauma)</div>
                  <div className="text-[11px] text-zinc-400">直接刺穿痛点，附加每回合流血撕裂</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Special Gems & Obstacles */}
          <div>
            <h4 className="font-serif font-bold text-zinc-100 text-sm mb-2">
              特殊合成宝石与障碍机制
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="font-bold text-zinc-100">4消合成【冲击催眠针】</span>
                <span className="text-zinc-400">：消除整行或整列，破坏大面积心防。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="font-bold text-zinc-100">L/T型5消【心灵深渊炸弹】</span>
                <span className="text-zinc-400">：引爆 3x3 范围内心魔碎片。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="font-bold text-zinc-100">直线5消【恶女之瞳】</span>
                <span className="text-zinc-400">：与任意宝石交换，全屏消除所有同色宝石！</span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30">
                <span className="font-bold text-red-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 inline" /> 哥哥障碍【心结死锁】 / <Flame className="w-3.5 h-3.5 inline" /> 弟弟障碍【浪子心火】
                </span>
                <span className="text-zinc-400 block mt-0.5">
                  锁链需邻近三消击碎；心火需在倒计时内消除，否则引爆周边并扣除医师从容度。
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
          >
            我已知悉 · 开始诊疗
          </button>
        </div>
      </div>
    </div>
  );
};
