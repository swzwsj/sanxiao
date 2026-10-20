import React, { useState, useEffect, useRef } from 'react';
import { Character, DefensePhase, StageDefensePhase } from '../types/game';
import {
  Shield,
  Activity,
  Timer,
  Flame,
  Heart,
  Lock,
  Sparkles,
  MessageSquareQuote,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface CharacterStageProps {
  character: Character;
  currentDefense: number;
  maxDefense: number;
  phase: DefensePhase;
  activeDialogText?: string;
  isHit: boolean;
  gimmickCooldown: number;
  turnCount: number;
  maxTurns: number;
  timeRemaining: number;
  timeLimit: number;
  timeDelta?: { amount: number; key: number } | null;
  currentPhaseIndex: number;
  phases: StageDefensePhase[];
  enemySkillAlert?: string | null;
  onSelectQuickChoice?: (choice: any) => void;
}

export const CharacterStage: React.FC<CharacterStageProps> = ({
  character,
  currentDefense,
  maxDefense,
  activeDialogText,
  isHit,
  gimmickCooldown,
  timeRemaining,
  timeLimit,
  currentPhaseIndex,
  phases,
  enemySkillAlert,
}) => {
  const [ghostPercent, setGhostPercent] = useState<number>(100);
  const [damagePopup, setDamagePopup] = useState<number | null>(null);
  const [isBouncing, setIsBouncing] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [previewPoseIndex, setPreviewPoseIndex] = useState<number | null>(null);
  const [phaseAnnounceBanner, setPhaseAnnounceBanner] = useState<{
    phaseIndex: number;
    title: string;
    subtitle: string;
    quote: string;
  } | null>(null);

  const prevDefenseRef = useRef(currentDefense);
  const prevPhaseIndexRef = useRef(currentPhaseIndex);

  // Active pose index follows game defense phase, with optional preview
  const activePose = previewPoseIndex !== null ? previewPoseIndex : currentPhaseIndex;

  const defensePercent = Math.max(0, Math.min(100, Math.round((currentDefense / maxDefense) * 100)));
  const currentStagePhase = phases[currentPhaseIndex] || phases[0];
  const remainingLayers = Math.max(1, phases.length - currentPhaseIndex);

  // 中间阶段文案展示延长增加 0.5 秒 (Extended intermediate breakthrough banner by +0.5s to 3.0s)
  useEffect(() => {
    if (prevPhaseIndexRef.current < currentPhaseIndex && phases[currentPhaseIndex]) {
      const newPhase = phases[currentPhaseIndex];
      setPhaseAnnounceBanner({
        phaseIndex: currentPhaseIndex,
        title: newPhase.name,
        subtitle: newPhase.subtitle,
        quote: newPhase.breakQuote,
      });

      // 延长展示时长至 3000ms（原 2000ms + 500ms~1000ms），让玩家充分体会剧情与情感递进
      const timer = setTimeout(() => {
        setPhaseAnnounceBanner(null);
      }, 3000);

      prevPhaseIndexRef.current = currentPhaseIndex;
      return () => clearTimeout(timer);
    }
    prevPhaseIndexRef.current = currentPhaseIndex;
  }, [currentPhaseIndex, phases]);

  // Damage popup and micro-shake on hit
  useEffect(() => {
    if (prevDefenseRef.current > currentDefense) {
      const damageTaken = prevDefenseRef.current - currentDefense;
      setDamagePopup(damageTaken);
      setIsBouncing(true);
      setIsShaking(true);

      const shakeTimer = setTimeout(() => {
        setIsShaking(false);
      }, 280);

      const bounceTimer = setTimeout(() => {
        setIsBouncing(false);
      }, 550);

      const ghostTimer = setTimeout(() => {
        setGhostPercent(defensePercent);
      }, 300);

      const popupTimer = setTimeout(() => {
        setDamagePopup(null);
      }, 950);

      prevDefenseRef.current = currentDefense;
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(bounceTimer);
        clearTimeout(ghostTimer);
        clearTimeout(popupTimer);
      };
    } else {
      prevDefenseRef.current = currentDefense;
      setGhostPercent(defensePercent);
    }
  }, [currentDefense, defensePercent]);

  // Reset preview when phase changes
  useEffect(() => {
    setPreviewPoseIndex(null);
  }, [currentPhaseIndex]);

  const isTimeCritical = timeRemaining <= 15;

  const visual = currentStagePhase?.visualStyle || {
    dishevelLevel: 0,
    blushOpacity: 0.1,
    auraColor: '#1e3a8a',
    ecgBaseBpm: 78,
    expressionBadge: '冷峻伪装',
  };

  const bpm = isHit ? visual.ecgBaseBpm + 28 : visual.ecgBaseBpm;

  // Dynamic Color Gradient for Defense Bar
  const getDefenseBarGradient = (ratio: number) => {
    if (ratio >= 0.75) {
      return 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #38bdf8 100%)';
    } else if (ratio >= 0.45) {
      return 'linear-gradient(90deg, #312e81 0%, #6366f1 45%, #c026d3 100%)';
    } else if (ratio >= 0.2) {
      return 'linear-gradient(90deg, #831843 0%, #e11d48 50%, #f43f5e 100%)';
    } else {
      return 'linear-gradient(90deg, #450a0a 0%, #dc2626 45%, #ef4444 100%)';
    }
  };

  const getDefenseGlowColor = (ratio: number) => {
    if (ratio >= 0.75) return 'rgba(56, 189, 248, 0.75)';
    if (ratio >= 0.45) return 'rgba(192, 38, 211, 0.75)';
    if (ratio >= 0.2) return 'rgba(244, 63, 94, 0.85)';
    return 'rgba(239, 68, 68, 0.95)';
  };

  // Determine Character Portrait
  const portraitUrl =
    character.id === 'yuchi'
      ? '/assets/aistudio/ff5b0d44690e58b29adf27c2e1c5ec53_edd7ce8f.jpg'
      : '/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg';

  const characterName = character.id === 'yuchi' ? '裴予迟' : '陆星河';

  // Dynamic Pose Descriptions following plot progression
  const poseConfigs = [
    {
      title: '姿态 I · 傲慢假面',
      subtitle: character.id === 'yuchi' ? '冷眼俯视，西装笔挺，戒心森严' : '薄纱冷艳，从容执网，不可侵犯',
      badge: '冷峻假面',
      scaleClass: 'scale-100 object-bottom',
      pulseClass: 'animate-[pulse_4s_ease-in-out_infinite]',
      color: '#38bdf8',
    },
    {
      title: '姿态 II · 领带微松',
      subtitle: character.id === 'yuchi' ? '领口解开，气息微喘，锁链缠绕' : '香肩微露，眼波流转，呼吸紊乱',
      badge: '动摇 · 呼吸紊乱',
      scaleClass: 'scale-115 object-[center_35%] translate-y-3 -rotate-1',
      pulseClass: 'animate-[pulse_1.8s_ease-in-out_infinite]',
      color: '#f59e0b',
    },
    {
      title: '姿态 III · 彻底破防',
      subtitle: character.id === 'yuchi' ? '衬衫敞开，失控沦陷，极致渴求' : '薄纱尽褪，眼神迷离，完全臣服',
      badge: '绝顶沦陷 · 彻底臣服',
      scaleClass: 'scale-135 object-[center_20%] translate-y-6 rotate-1',
      pulseClass: 'animate-[pulse_1.1s_ease-in-out_infinite]',
      color: '#f43f5e',
    },
  ];

  const currentPose = poseConfigs[activePose] || poseConfigs[0];

  // Progressive Character Dialogues by Phase (每阶段台词递进深化)
  const getProgressiveDialog = () => {
    if (isHit) {
      if (activePose === 0) {
        return character.id === 'yuchi'
          ? '“啧……这点试探，还动摇不了我！”'
          : '“小狗，爪子还挺利，但还早着呢。”';
      } else if (activePose === 1) {
        return character.id === 'yuchi'
          ? '“呃啊……！别碰……心跳快要炸开了……”'
          : '“唔……指尖好烫……心律完全被你打乱了……”';
      } else {
        return character.id === 'yuchi'
          ? '“啊……姐姐……快要把我整个人融化了……”'
          : '“随你怎样撕碎我都好……彻底沉沦吧……”';
      }
    }

    if (activeDialogText && activeDialogText.length > 0) {
      return activeDialogText;
    }

    if (character.id === 'yuchi') {
      if (activePose === 0) {
        return '“哟，陆姐姐，你靠这么近是在听我心跳，还是想看看我有多桀骜不驯？”';
      } else if (activePose === 1) {
        return '“操……！陆星河，你到底对我做了什么？心跳根本停不下来……别再靠近了！”';
      } else {
        return '“我认栽了……赛车归你，钥匙归你，我也归你！姐姐……求你摸摸我的头好不好……”';
      }
    } else {
      if (activePose === 0) {
        return '“小狗，就凭这点三脚猫功夫，也妄想反过来解构我的心防？”';
      } else if (activePose === 1) {
        return '“呃……！停下……不要碰那里……你的视线快要把我融化了……”';
      } else {
        return '“全盘……托付给你……今晚，任你为所欲为……！”';
      }
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black border border-zinc-800/80 p-3 sm:p-4 shadow-2xl overflow-hidden transition-all duration-150 ${
        isHit ? 'scale-[0.985] border-red-500/70 shadow-[0_0_35px_rgba(239,68,68,0.45)]' : ''
      }`}
    >
      {/* Background Phase Atmospheric Aura */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-35"
        style={{ backgroundColor: visual.auraColor }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-25"
        style={{ backgroundColor: visual.auraColor }}
      />

      {/* Enemy Disruptive Skill Notification Banner */}
      {enemySkillAlert && (
        <div className="absolute top-2 inset-x-2 z-40 flex items-center justify-center pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-950 via-red-900 to-rose-950 border border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)] flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            <span className="font-serif font-black text-xs text-white tracking-wide">
              {enemySkillAlert}
            </span>
          </div>
        </div>
      )}

      {/* Steam Mirror Style Top Bar: Enemy Health Bar + x Layer Multiplier + Flame Gimmick Orb */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-800/80 relative z-10">
        {/* Defense Bar Section (with shake animation on damage) */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>{characterName}</span>
              </span>
              <span className="text-[10px] font-sans px-2 py-0.2 rounded-full border border-rose-500/40 bg-rose-950/70 text-rose-300 font-medium">
                {currentPose.badge}
              </span>
            </div>

            {/* Mirror-style ECG Heartbeat & Unified Timer Display */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-900/90 px-2 py-0.5 rounded-lg border border-zinc-800 text-[11px] font-mono text-rose-400">
                <Activity className={`w-3 h-3 ${activePose === 2 ? 'text-red-500 animate-bounce' : 'text-rose-400'}`} />
                <span>{bpm} BPM</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-mono transition-all ${
                    isTimeCritical
                      ? 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                      : 'bg-zinc-900/90 border-zinc-800 text-amber-300'
                  }`}
                  title={`诊疗倒计时：剩余 ${Math.max(0, Math.ceil(timeRemaining))} 秒 / 初始限时 ${timeLimit} 秒`}
                >
                  <Timer className={`w-3 h-3 ${isTimeCritical ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
                  <span className="font-bold">{Math.max(0, Math.ceil(timeRemaining))}s</span>
                  <span className="text-zinc-500 text-[9px] font-normal">/ {timeLimit}s</span>
                </div>
                {/* Mini Time Ratio Gauge */}
                <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                  <div
                    className={`h-full transition-all duration-200 ease-out rounded-full ${
                      isTimeCritical ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / Math.max(1, timeLimit)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Defense Bar Gauge with Mirror Bevel and requested Micro-Shake (颤动) Animation */}
          <div
            className={`relative h-6 sm:h-7 bg-zinc-950 rounded-xl overflow-hidden p-[2px] border transition-all duration-75 ${
              isShaking
                ? 'animate-defense-shake border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.85)] ring-1 ring-red-400'
                : 'border-zinc-800 shadow-inner'
            }`}
          >
            {/* Ghost Trail (delayed previous defense) */}
            <div
              className="absolute top-[2px] bottom-[2px] left-[2px] rounded-lg bg-red-500/45 transition-all duration-500 ease-out"
              style={{ width: `${ghostPercent}%` }}
            />

            {/* Dynamic Color Gradient Active Fill */}
            <div
              className="relative h-full rounded-lg transition-all duration-300 ease-out flex items-center justify-end px-2"
              style={{
                width: `${defensePercent}%`,
                background: getDefenseBarGradient(defensePercent / 100),
                boxShadow: `0 0 16px ${getDefenseGlowColor(defensePercent / 100)}`,
              }}
            >
              {/* Shimmer Light Sweeping Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>

            {/* Defense Numerical Values */}
            <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-mono pointer-events-none">
              <span className="font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1 text-[11px]">
                <span>心防</span>
                <span className="text-zinc-400 text-[10px]">({currentStagePhase.name})</span>
              </span>

              <div className="flex items-center gap-1.5">
                {damagePopup !== null && (
                  <span className="font-sans font-black text-xs text-amber-300 animate-in zoom-in-50 fade-out duration-700 drop-shadow-[0_0_8px_#f59e0b]">
                    -{damagePopup}
                  </span>
                )}
                <span
                  className={`font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-transform duration-100 ${
                    isBouncing ? 'scale-125 text-red-400' : 'scale-100'
                  }`}
                >
                  {Math.max(0, currentDefense)}
                  <span className="text-zinc-400 font-normal text-[10px]"> / {maxDefense}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Steam Mirror Style: Layer Count 'x 3' Badge */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="px-2.5 py-1 rounded-xl bg-gradient-to-b from-emerald-950 via-zinc-900 to-black border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <span className="font-serif font-black text-emerald-400 text-xs sm:text-sm tracking-wider">
              x {remainingLayers}
            </span>
          </div>
        </div>

        {/* Steam Mirror Style: Circular Flaming Gimmick Orb */}
        <div
          className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-red-950 via-zinc-950 to-black border-2 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center shrink-0 group"
          title={`敌方技能充能倒计时：${gimmickCooldown} 回合后触发干扰技能`}
        >
          <Flame className="w-5 h-5 text-amber-400 animate-pulse drop-shadow-[0_0_8px_#f59e0b]" />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 border border-white/80 text-[9px] font-mono font-bold text-white flex items-center justify-center shadow-md">
            {gimmickCooldown}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DYNAMIC ATMOSPHERIC CHARACTER STAGE (3 Distinct Scene Phases) */}
      {/* Phase 0: 清爽诊室 (Crisp Clinic Suite with Sheer Blinds & Daylight) */}
      {/* Phase 1: 昏暗密室 (Oppressive Twilight, Jagged Shadows & Binding Chains) */}
      {/* Phase 2: 扭曲深渊 (Warped Abyss Vortex, Eldritch Veins & Shattered Shards) */}
      {/* ======================================================== */}
      <div className="relative h-[430px] sm:h-[480px] lg:h-[530px] w-full flex items-center justify-center my-1 rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl group transition-all duration-700">
        
        {/* ---------------- SCENE 1: 清爽诊室 (PHASE 0) ---------------- */}
        {activePose === 0 && (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-700">
            {/* Pristine Modern Consulting Suite Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/90 to-cyan-950/30" />
            
            {/* Diagonal Venetian Blinds Sunlight / Moonlight Slats */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 24px)',
              }}
            />

            {/* Soft Clinical Room Lighting Spot */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

            {/* Clinic Environment Tag */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono backdrop-blur-md shadow-sm">
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>清爽诊室 · 理智防线森严</span>
            </div>
          </div>
        )}

        {/* ---------------- SCENE 2: 昏暗压抑·心魔锁链 (PHASE 1) ---------------- */}
        {activePose === 1 && (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-700">
            {/* Oppressive Gloom Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-950/85 via-zinc-950 to-red-950/75" />

            {/* Heavy Claustrophobic Vignette */}
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background: 'radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.85) 90%)',
              }}
            />

            {/* Jagged Shadow Blinds and Amber Warning Flares */}
            <div className="absolute top-1/4 -left-10 w-80 h-80 bg-red-600/15 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-1/4 -right-10 w-80 h-80 bg-amber-600/15 rounded-full blur-2xl" />

            {/* Rusted Heavy Iron Chains Overlay (Criss-Cross Chains) */}
            <div className="absolute inset-0 flex items-center justify-around opacity-80 animate-chain-rattle">
              <div className="text-4xl text-amber-200/40 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transform -rotate-12">
                ⛓️⛓️⛓️
              </div>
              <div className="text-4xl text-amber-200/40 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transform rotate-12">
                ⛓️⛓️⛓️
              </div>
            </div>

            {/* Twilight Oppressive Environment Tag */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-amber-500/50 text-[10px] text-amber-300 font-mono backdrop-blur-md shadow-lg animate-pulse">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>昏暗密室 · 锁链死锁 · 心防开裂</span>
            </div>
          </div>
        )}

        {/* ---------------- SCENE 3: 扭曲深渊·彻底破防 (PHASE 2) ---------------- */}
        {activePose === 2 && (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 animate-abyss-warp">
            {/* Deep Crimson Eldritch Abyss Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-rose-950 via-black to-red-950" />

            {/* Pulsating Abyss Vortex Spiral */}
            <div
              className="absolute -inset-10 opacity-30 animate-vortex-spin"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at center, rgba(244,63,94,0.4) 0%, rgba(225,29,72,0.15) 45%, transparent 70%)',
              }}
            />

            {/* Floating Broken Mirror Shards & Shattered Hearts */}
            <div className="absolute inset-0 flex items-center justify-between px-8 text-2xl opacity-60">
              <span className="animate-bounce drop-shadow-[0_0_15px_#f43f5e]">💔</span>
              <span className="animate-pulse drop-shadow-[0_0_15px_#ef4444]">✦</span>
              <span className="animate-bounce drop-shadow-[0_0_15px_#f43f5e]">💔</span>
            </div>

            {/* Pulsating Heartbeat Shockwave Aura */}
            <div className="absolute inset-0 bg-red-600/20 mix-blend-color-dodge animate-pulse" />

            {/* Warped Abyss Environment Tag */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/90 border border-rose-500/80 text-[10px] text-rose-200 font-mono backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>扭曲深渊 · 精神瓦解 · 绝顶臣服</span>
            </div>
          </div>
        )}

        {/* Dynamic Pose Shift Character Model */}
        <div
          className={`relative w-full h-full flex items-center justify-center transition-all duration-700 ease-out z-10 ${
            isHit ? 'translate-x-1 -translate-y-1 scale-[1.03] filter brightness-125' : ''
          }`}
        >
          <img
            src={portraitUrl}
            alt={characterName}
            className={`w-full h-full object-contain transition-all duration-700 drop-shadow-[0_15px_35px_rgba(0,0,0,0.95)] ${
              currentPose.scaleClass
            } ${currentPose.pulseClass} ${
              activePose === 1
                ? 'filter contrast-110 saturate-125 brightness-105'
                : activePose === 2
                ? 'filter contrast-125 saturate-140 brightness-110'
                : 'filter contrast-100'
            }`}
          />

          {/* Phase 2 Overlay Details: Binding Chains & Warm Flushed Blush */}
          {activePose === 1 && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 transition-opacity duration-700">
              <div className="self-end px-2.5 py-1 rounded-full bg-black/80 border border-amber-500/60 text-[11px] font-medium text-amber-300 backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-pulse">
                <Heart className="w-3.5 h-3.5 text-amber-400" />
                <span>领带微松 · 呼吸粗重</span>
              </div>
              <div className="absolute inset-0 pointer-events-none mix-blend-color opacity-30 bg-rose-600 transition-opacity duration-500" />
            </div>
          )}

          {/* Phase 3 Overlay Details: Climax Broken Chains & Total Submission */}
          {activePose === 2 && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 bg-gradient-to-t from-red-950/80 via-transparent to-red-950/20">
              <div className="self-end text-[11px] font-serif font-black text-rose-200 px-3.5 py-1 rounded-full bg-black/85 border border-rose-500/80 backdrop-blur-md shadow-[0_0_20px_#f43f5e] animate-pulse flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>独占契约 · 衬衫敞开 · 彻底破防</span>
              </div>
              <div className="absolute inset-0 pointer-events-none mix-blend-color opacity-45 bg-red-600 animate-pulse transition-opacity duration-500" />
            </div>
          )}

          {/* Hit Shudder Crimson Flash */}
          {isHit && (
            <div className="absolute inset-0 bg-red-600/35 pointer-events-none animate-ping" />
          )}
        </div>

        {/* ======================================================== */}
        {/* INTERMEDIATE PHASE BREAKTHROUGH BANNER (延长增加 0.5s) */}
        {/* ======================================================== */}
        {phaseAnnounceBanner && (
          <div className="absolute top-12 inset-x-3 z-30 flex items-center justify-center animate-in fade-in zoom-in-95 duration-300 pointer-events-none">
            <div className="max-w-md w-full p-3 rounded-2xl bg-black/90 border-2 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.7)] backdrop-blur-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-serif font-black text-rose-400 uppercase tracking-widest">
                <AlertCircle className="w-4 h-4 animate-bounce" />
                <span>心防深层突破 · 进入【{phaseAnnounceBanner.title}】</span>
                <AlertCircle className="w-4 h-4 animate-bounce" />
              </div>
              <p className="text-[11px] text-zinc-300 mt-1 font-sans italic line-clamp-2">
                {phaseAnnounceBanner.quote}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PROGRESSIVE CHARACTER VOICE DIALOGUE BUBBLE (台词递进深化) */}
        {/* ======================================================== */}
        <div className="absolute bottom-11 inset-x-3 z-20">
          <div
            className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 ${
              isHit
                ? 'bg-red-950/90 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                : activePose === 2
                ? 'bg-rose-950/80 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : activePose === 1
                ? 'bg-zinc-950/85 border-amber-500/50'
                : 'bg-zinc-950/85 border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="flex items-center gap-1 text-white font-bold">
                <MessageSquareQuote className="w-3.5 h-3.5 text-rose-400" />
                <span>{characterName}</span>
                <span className="text-zinc-400 font-normal">[{currentPose.badge}]</span>
              </span>
              <span className="text-zinc-500 text-[9px]">
                {activePose === 0 ? '阶段 I · 冷峻防卫' : activePose === 1 ? '阶段 II · 动摇喘息' : '阶段 III · 极乐臣服'}
              </span>
            </div>
            <p
              className={`text-xs font-serif leading-relaxed line-clamp-2 transition-colors duration-200 ${
                isHit
                  ? 'text-amber-200 font-black animate-pulse'
                  : activePose === 2
                  ? 'text-rose-100 italic'
                  : activePose === 1
                  ? 'text-amber-100'
                  : 'text-zinc-200'
              }`}
            >
              {getProgressiveDialog()}
            </p>
          </div>
        </div>

        {/* Bottom Pose Track Indicator (Follows plot & breakdown progression!) */}
        <div className="absolute bottom-2 inset-x-3 flex items-center justify-between bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 z-20">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-mono">破防姿态：</span>
            <span className="text-xs font-bold text-white font-serif flex items-center gap-1">
              <span style={{ color: currentPose.color }}>✦</span>
              <span>{currentPose.title}</span>
            </span>
          </div>

          {/* 3 Interactive Pose Progression Nodes */}
          <div className="flex items-center gap-1">
            {poseConfigs.map((cfg, idx) => {
              const isUnlocked = idx <= currentPhaseIndex;
              const isSelected = activePose === idx;

              return (
                <button
                  key={idx}
                  onClick={() => isUnlocked && setPreviewPoseIndex(idx)}
                  disabled={!isUnlocked}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-rose-600 text-white font-bold shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                      : isUnlocked
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer'
                      : 'bg-zinc-950 text-zinc-600 opacity-50 cursor-not-allowed'
                  }`}
                  title={isUnlocked ? cfg.subtitle : '尚未破防解锁该姿态'}
                >
                  {!isUnlocked && <Lock className="w-2.5 h-2.5" />}
                  <span>P{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
