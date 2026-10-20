import React, { useState } from 'react';
import { X, FileText, Lock, Shield, HeartCrack, Sparkles } from 'lucide-react';
import { CHARACTERS, PLAYER_HEROINE } from '../data/characters';

interface SecretDossierModalProps {
  onClose: () => void;
  unlockedStages: Record<string, number>; // characterId -> max stage reached
}

export const SecretDossierModal: React.FC<SecretDossierModalProps> = ({
  onClose,
  unlockedStages,
}) => {
  const [activeTab, setActiveTab] = useState<'lu' | 'yanchen' | 'yuchi'>('yanchen');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-400" />
            <h3 className="font-serif font-bold text-base text-zinc-100">
              绝密病历与心防审讯档案 (Psychiatric Dossiers)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setActiveTab('lu')}
            className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'lu'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>主治医师 · 陆星河</span>
          </button>

          <button
            onClick={() => setActiveTab('yanchen')}
            className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'yanchen'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>裴宴臣 · 霸总绿茶</span>
          </button>

          <button
            onClick={() => setActiveTab('yuchi')}
            className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'yuchi'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HeartCrack className="w-3.5 h-3.5" />
            <span>裴予迟 · 浪子忠犬</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'lu' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900 border border-rose-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-rose-400 font-semibold">{PLAYER_HEROINE.title}</span>
                  <span className="text-xs text-zinc-400">{PLAYER_HEROINE.identity}</span>
                </div>
                <h4 className="text-xl font-serif font-black text-white">{PLAYER_HEROINE.name}</h4>
                <p className="text-xs text-rose-300 font-serif italic mt-2">
                  {PLAYER_HEROINE.quote}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <h5 className="text-xs font-bold text-zinc-200 mb-2">人格解构分析</h5>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  表面上是行业顶尖的资深心理顾问、理智优雅的大女主形象，接受各界政商名流的重金咨询；然而在精致的职业面具之下，却有着把玩男人欲望与创伤的极恶疯批本能。
                  她深谙人性的阴暗面，越是自命清高的男人，她越享受将其心防一层层剥开、目睹其绝望与臣服的全过程。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <h5 className="text-xs font-bold text-zinc-200 mb-2">执网者备忘录</h5>
                <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside">
                  <li>“裴宴臣那条狗，三年前被我弃养过一次，居然到现在还把当年的项圈当成宝贝留着。”</li>
                  <li>“至于他的弟弟裴予迟……小年轻总是以为能凭蛮力破局，稍加引导，就彻底变成摇尾乞怜的小狼狗了。”</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'yanchen' && (
            <div className="space-y-4 animate-in fade-in">
              {(() => {
                const char = CHARACTERS.find(c => c.id === 'yanchen')!;
                const reached = unlockedStages['yanchen'] || 1;

                return (
                  <>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-blue-400 font-semibold">{char.title}</span>
                        <span className="text-xs text-zinc-400">29岁 · 裴氏财阀CEO</span>
                      </div>
                      <h4 className="text-xl font-serif font-black text-white">{char.name}</h4>
                      <p className="text-xs text-zinc-300 mt-2">
                        {char.archetype}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <h5 className="text-xs font-bold text-blue-300 mb-1">私密怪癖与弱点</h5>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {char.secretTrait} 表面上以商业合作和复仇借口逼近陆星河，实际只要陆星河稍施一点威压与冷漠，他的心理防御就会出现雪崩式瓦解。
                      </p>
                    </div>

                    {/* Stage Records */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-zinc-300">诊疗进程与调教报告</h5>
                      {char.stages.map((stage) => {
                        const isUnlocked = reached >= stage.id;
                        return (
                          <div
                            key={stage.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isUnlocked
                                ? 'bg-zinc-900/80 border-blue-500/30'
                                : 'bg-zinc-950/40 border-zinc-800/40 opacity-50'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-zinc-200">
                                {stage.title}
                              </span>
                              {isUnlocked ? (
                                <span className="text-[10px] text-emerald-400">已解锁归档</span>
                              ) : (
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> 未解锁
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              {isUnlocked ? stage.unlockedDossierText : '心防未曾完全击碎，档案处于机密加密状态。'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'yuchi' && (
            <div className="space-y-4 animate-in fade-in">
              {(() => {
                const char = CHARACTERS.find(c => c.id === 'yuchi')!;
                const reached = unlockedStages['yuchi'] || 1;

                return (
                  <>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-red-400 font-semibold">{char.title}</span>
                        <span className="text-xs text-zinc-400">22岁 · 职业赛车手</span>
                      </div>
                      <h4 className="text-xl font-serif font-black text-white">{char.name}</h4>
                      <p className="text-xs text-zinc-300 mt-2">
                        {char.archetype}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <h5 className="text-xs font-bold text-red-300 mb-1">私密怪癖与弱点</h5>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {char.secretTrait} 桀骜不驯的野马外表下，有着近乎病态的被支配渴望。一旦在心理拉扯中被陆星河彻底压制，就会变成眼眶泛红、死死护主的忠犬。
                      </p>
                    </div>

                    {/* Stage Records */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-zinc-300">诊疗进程与调教报告</h5>
                      {char.stages.map((stage) => {
                        const isUnlocked = reached >= stage.id;
                        return (
                          <div
                            key={stage.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isUnlocked
                                ? 'bg-zinc-900/80 border-red-500/30'
                                : 'bg-zinc-950/40 border-zinc-800/40 opacity-50'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-zinc-200">
                                {stage.title}
                              </span>
                              {isUnlocked ? (
                                <span className="text-[10px] text-emerald-400">已解锁归档</span>
                              ) : (
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> 未解锁
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              {isUnlocked ? stage.unlockedDossierText : '心防未曾完全击碎，档案处于机密加密状态。'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
