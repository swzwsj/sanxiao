import React, { useState, useEffect, useRef } from 'react';
import { Character, ConsultationStage, GameEnding } from '../types/game';
import {
  HeartCrack,
  Award,
  ArrowRight,
  RotateCcw,
  Trophy,
  Timer,
  Sparkles,
  Crown,
  Flame,
  Shield,
  Activity,
  FastForward,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface VictoryModalProps {
  character: Character;
  stage: ConsultationStage;
  maxCombo: number;
  totalDamage: number;
  turnsRemaining: number;
  timeRemaining: number;
  timeLimit?: number;
  composure: number;
  unlockedEnding: GameEnding | null;
  onContinueToStory: () => void;
  onRetry: () => void;
  onOpenDossier: () => void;
  onOpenGallery: () => void;
}

interface GradeConfig {
  grade: 'S' | 'A' | 'B' | 'C';
  title: string;
  subtitle: string;
  comment: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  ribbonColor: string;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  character,
  stage,
  maxCombo,
  timeRemaining,
  timeLimit = 75,
  composure,
  unlockedEnding,
  onContinueToStory,
  onRetry,
  onOpenGallery,
}) => {
  // 统一诊疗时限计算与展示 (Unified Consultation Time Calculation):
  // 1. 基准总时限 (确保与选关配置及前置Buff加成完全一致)
  const safeTimeLimit = timeLimit && timeLimit > 0 ? timeLimit : (stage.timeLimit || 75);
  // 2. 剩余时限 (防止负数)
  const safeTimeRemaining = Math.max(0, timeRemaining);
  const remainingSeconds = Math.round(safeTimeRemaining);
  // 3. 通关耗时 (总时限 - 剩余时间)
  const timeElapsed = Math.max(0, Math.round(safeTimeLimit - safeTimeRemaining));

  // 综合战斗效率评级算法 (Comprehensive Efficiency Evaluation Model):
  // 1. 通关时间权重 (0 ~ 40分) - 剩余时限占比越高，通关越迅捷，得分越高
  const timeRatio = Math.max(0, Math.min(1, safeTimeRemaining / safeTimeLimit));
  const targetTimeScore = Math.round(timeRatio * 40);

  // 2. 最大连击数权重 (0 ~ 35分)
  const targetComboScore = Math.min(35, Math.round((maxCombo / 5) * 35));

  // 3. 医师从容度权重 (0 ~ 25分)
  const targetComposureScore = Math.min(25, Math.round((composure / 100) * 25));

  // 综合战斗效率目标得分 (10 ~ 100)
  const totalEfficiencyScore = Math.min(
    100,
    Math.max(10, targetTimeScore + targetComboScore + targetComposureScore)
  );

  const getGradeConfig = (score: number, time: number, combo: number, comp: number): GradeConfig => {
    if (score >= 80 || (time >= 25 && combo >= 4 && comp >= 65)) {
      return {
        grade: 'S',
        title: 'S 级 · 完美支配',
        subtitle: 'PERFECT DOMINATION',
        comment: '迅猛撕裂心防，狂暴连锁绝杀，医师从容无损，呈现绝对神级执网表现！',
        badgeBg: 'bg-gradient-to-b from-amber-400 via-amber-600 to-yellow-800',
        borderColor: 'border-amber-400',
        textColor: 'text-amber-300',
        glowColor: 'rgba(251, 191, 36, 0.85)',
        ribbonColor: 'from-amber-500 to-yellow-600',
      };
    }
    if (score >= 65 || (time >= 15 && combo >= 3)) {
      return {
        grade: 'A',
        title: 'A 级 · 极速破防',
        subtitle: 'EXCELLENT CONQUEST',
        comment: '凌厉攻势行云流水，精准拿捏软肋，顺利攻克目标顽强心理防线！',
        badgeBg: 'bg-gradient-to-b from-rose-500 via-rose-600 to-red-900',
        borderColor: 'border-rose-400',
        textColor: 'text-rose-300',
        glowColor: 'rgba(244, 63, 94, 0.85)',
        ribbonColor: 'from-rose-500 to-red-600',
      };
    }
    if (score >= 50) {
      return {
        grade: 'B',
        title: 'B 级 · 稳健突破',
        subtitle: 'SKILLED BREAKTHROUGH',
        comment: '战况交错稳步推进，虽经波折但最终将目标心防全数击穿。',
        badgeBg: 'bg-gradient-to-b from-indigo-500 via-indigo-600 to-blue-900',
        borderColor: 'border-indigo-400',
        textColor: 'text-indigo-300',
        glowColor: 'rgba(129, 140, 248, 0.75)',
        ribbonColor: 'from-indigo-500 to-blue-600',
      };
    }
    return {
      grade: 'C',
      title: 'C 级 · 极限逆转',
      subtitle: 'NARROW ESCAPE',
      comment: '时限紧迫险象环生，医师在反噬边缘险中求胜，勉强达成突破。',
      badgeBg: 'bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-950',
      borderColor: 'border-emerald-400',
      textColor: 'text-emerald-300',
      glowColor: 'rgba(52, 211, 153, 0.7)',
      ribbonColor: 'from-emerald-500 to-teal-600',
    };
  };

  const gradeConfig = getGradeConfig(totalEfficiencyScore, safeTimeRemaining, maxCombo, composure);

  // 动态揭示动画状态 (Score & Grade Dynamic Reveal Animation)
  const [displayedTimeScore, setDisplayedTimeScore] = useState(0);
  const [displayedComboScore, setDisplayedComboScore] = useState(0);
  const [displayedComposureScore, setDisplayedComposureScore] = useState(0);
  const [displayedTotalScore, setDisplayedTotalScore] = useState(0);
  const [isGradeRevealed, setIsGradeRevealed] = useState(false);
  const [isStampImpact, setIsStampImpact] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const tickAudioCounterRef = useRef(0);

  // 动态数值递增与评级揭示流程
  useEffect(() => {
    const DURATION = 1100; // 1.1s 数值滚动时间

    const animateScores = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / DURATION);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const curTime = Math.round(eased * targetTimeScore);
      const curCombo = Math.round(eased * targetComboScore);
      const curComp = Math.round(eased * targetComposureScore);
      const curTotal = Math.round(eased * totalEfficiencyScore);

      setDisplayedTimeScore(curTime);
      setDisplayedComboScore(curCombo);
      setDisplayedComposureScore(curComp);
      setDisplayedTotalScore(curTotal);

      // 定期播放轻微数字滚动机械音
      tickAudioCounterRef.current++;
      if (tickAudioCounterRef.current % 4 === 0 && progress < 0.95) {
        soundManager.playScoreCountTick();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateScores);
      } else {
        // 完成数值滚动，进入震撼评级揭示 (Grade Reveal Slam!)
        setDisplayedTimeScore(targetTimeScore);
        setDisplayedComboScore(targetComboScore);
        setDisplayedComposureScore(targetComposureScore);
        setDisplayedTotalScore(totalEfficiencyScore);

        setTimeout(() => {
          setIsGradeRevealed(true);
          setIsStampImpact(true);
          soundManager.playGradeStampSlam(gradeConfig.grade);

          setTimeout(() => {
            setIsStampImpact(false);
            setIsAnimationFinished(true);
          }, 450);
        }, 150);
      }
    };

    animationRef.current = requestAnimationFrame(animateScores);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [targetTimeScore, targetComboScore, targetComposureScore, totalEfficiencyScore, gradeConfig.grade]);

  // 跳过动画处理
  const handleSkipAnimation = () => {
    if (isAnimationFinished) return;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setDisplayedTimeScore(targetTimeScore);
    setDisplayedComboScore(targetComboScore);
    setDisplayedComposureScore(targetComposureScore);
    setDisplayedTotalScore(totalEfficiencyScore);
    setIsGradeRevealed(true);
    setIsStampImpact(true);
    setIsAnimationFinished(true);
    soundManager.playGradeStampSlam(gradeConfig.grade);
    setTimeout(() => {
      setIsStampImpact(false);
    }, 400);
  };

  const getGradeIcon = (grade: 'S' | 'A' | 'B' | 'C') => {
    switch (grade) {
      case 'S':
        return <Crown className="w-6 h-6 text-amber-200 animate-bounce" />;
      case 'A':
        return <Flame className="w-6 h-6 text-rose-200 animate-pulse" />;
      case 'B':
        return <Shield className="w-6 h-6 text-indigo-200" />;
      case 'C':
        return <Activity className="w-6 h-6 text-emerald-200" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_70px_rgba(0,0,0,0.95)] overflow-hidden p-5 sm:p-6 text-center my-auto">
        {/* Top Radiant Background Atmosphere */}
        <div
          className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b to-transparent pointer-events-none opacity-25 blur-2xl transition-all duration-700"
          style={{ backgroundColor: gradeConfig.glowColor }}
        />

        {/* Skip Animation Quick Button */}
        {!isAnimationFinished && (
          <button
            onClick={handleSkipAnimation}
            className="absolute top-4 right-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-white transition-all cursor-pointer shadow-md"
            title="跳过动态揭示动画"
          >
            <FastForward className="w-3 h-3 text-amber-400" />
            <span>跳过</span>
          </button>
        )}

        {/* Climax Heartbreak Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <HeartCrack className="w-5 h-5 text-rose-500 animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-wider uppercase drop-shadow-md">
            心防彻底崩解
          </h2>
          <HeartCrack className="w-5 h-5 text-rose-500 animate-pulse" />
        </div>
        <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
          MIND DEFENSE TOTALLY COLLAPSED · EFFICIENCY EVALUATION
        </p>

        {/* Central Dedicated Battle Efficiency Evaluation Badge (战斗效率动态揭示系统) */}
        <div className="relative my-4 p-4 rounded-2xl bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-black border border-zinc-800/90 shadow-2xl flex items-center justify-between gap-4 overflow-hidden">
          {/* Left: Dynamic Evaluation Medal Emblem */}
          <div className="relative flex items-center justify-center shrink-0 w-22 h-22 sm:w-24 sm:h-24">
            {/* Outer Radiant Glow */}
            <div
              className={`absolute -inset-2 rounded-full blur-md opacity-60 transition-opacity duration-500 pointer-events-none ${
                isGradeRevealed ? 'animate-pulse' : 'opacity-20'
              }`}
              style={{ backgroundColor: gradeConfig.glowColor }}
            />

            {/* Ripple Shockwave Ring on Stamp Slam */}
            {isStampImpact && (
              <div
                className="absolute inset-0 rounded-full border-2 animate-ripple-shockwave pointer-events-none"
                style={{ borderColor: gradeConfig.glowColor }}
              />
            )}

            {/* Medal Frame */}
            {isGradeRevealed ? (
              <div
                className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 border-2 shadow-2xl flex items-center justify-center ${
                  gradeConfig.borderColor
                } ${isStampImpact ? 'animate-stamp-impact' : ''}`}
                style={{ boxShadow: `0 0 30px ${gradeConfig.glowColor}` }}
              >
                <div
                  className={`w-full h-full rounded-full flex flex-col items-center justify-center text-white shadow-inner ${gradeConfig.badgeBg}`}
                >
                  {/* Grade Icon */}
                  <div className="drop-shadow-md">{getGradeIcon(gradeConfig.grade)}</div>

                  {/* Grade Letter (S, A, B, C) */}
                  <span className="font-serif font-black text-3xl sm:text-4xl leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] tracking-tight">
                    {gradeConfig.grade}
                  </span>
                </div>
              </div>
            ) : (
              /* Mystery Pre-Reveal State */
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 border-2 border-zinc-700 bg-zinc-900/80 flex flex-col items-center justify-center text-zinc-500 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="font-mono text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-wider animate-pulse">
                  评定中
                </span>
              </div>
            )}
          </div>

          {/* Right: Grade Title, Subtitle, and Dynamic Total Score */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs sm:text-sm font-serif font-black tracking-wide flex items-center gap-1.5 transition-colors duration-500 ${
                  isGradeRevealed ? gradeConfig.textColor : 'text-zinc-400'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{isGradeRevealed ? gradeConfig.title : '心理效能综合测算'}</span>
              </span>
              <span className="font-mono text-xs font-bold text-amber-300 bg-zinc-900/90 px-2 py-0.5 rounded-lg border border-zinc-800 shadow-sm">
                综合评分 {displayedTotalScore}
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 mt-1 line-clamp-2 leading-relaxed font-sans min-h-[32px]">
              {isGradeRevealed ? gradeConfig.comment : '正在分析时限掌控、最大连锁爆发与从容耐受度……'}
            </p>

            {/* Overall Efficiency Progress Gauge (Dynamically Stretches) */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                <span>战斗综合效能评级</span>
                <span className={gradeConfig.textColor}>
                  {displayedTotalScore >= 80 ? 'EXCEEDING (超越期望)' : 'PASSED (顺利突破)'}
                </span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden p-[1px] border border-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${displayedTotalScore}%`,
                    backgroundColor: isGradeRevealed ? gradeConfig.glowColor : '#fbbf24',
                    boxShadow: isGradeRevealed ? `0 0 12px ${gradeConfig.glowColor}` : '0 0 8px #fbbf24',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Efficiency Factor Contribution Breakdown Cards (统一时限与耗时展示) */}
        <div className="grid grid-cols-3 gap-2 my-3 text-left">
          {/* Time Efficiency (通关耗时与剩余时限完全统一清晰) */}
          <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-emerald-400" />
                <span>时效分</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">+{displayedTimeScore}</span>
            </div>
            <div className="mt-1">
              <div className="font-mono font-black text-sm text-white">
                用时 {timeElapsed}s
              </div>
              <div className="text-[9px] text-zinc-400 truncate mt-0.5" title={`剩余 ${remainingSeconds}秒 / 初始限时 ${safeTimeLimit}秒`}>
                剩余 {remainingSeconds}s / {safeTimeLimit}s
              </div>
            </div>
          </div>

          {/* Combo Efficiency */}
          <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>连击分</span>
              </span>
              <span className="font-mono font-bold text-amber-400">+{displayedComboScore}</span>
            </div>
            <div className="mt-1">
              <div className="font-mono font-black text-sm text-white">
                x{maxCombo} <span className="text-[10px] font-normal text-zinc-400">连消</span>
              </div>
              <div className="text-[9px] text-zinc-400 truncate mt-0.5">最高连锁爆发</div>
            </div>
          </div>

          {/* Composure Defense */}
          <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-sky-400" />
                <span>从容分</span>
              </span>
              <span className="font-mono font-bold text-sky-400">+{displayedComposureScore}</span>
            </div>
            <div className="mt-1">
              <div className="font-mono font-black text-sm text-white">
                {composure} <span className="text-[10px] font-normal text-zinc-400">SAN</span>
              </div>
              <div className="text-[9px] text-zinc-400 truncate mt-0.5">医师未损心理</div>
            </div>
          </div>
        </div>

        {/* Character Submission & Stage Info */}
        <div className="my-2 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-left">
          <div className="text-xs text-zinc-400 flex items-center justify-between">
            <span>咨询对象：{character.name}</span>
            <span className="text-rose-400 font-semibold">{stage.title}</span>
          </div>
          <p className="text-[11px] text-zinc-300 italic mt-0.5 font-serif leading-relaxed line-clamp-2">
            “……{stage.phaseDialogs.at0}”
          </p>
        </div>

        {/* Unlocked Branching Ending Banner */}
        {unlockedEnding && (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900 border border-rose-500/40 text-left mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950 px-2 py-0.2 rounded border border-rose-500/30">
                {unlockedEnding.tag}
              </span>
              <span className="text-[11px] font-serif font-bold text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> 已解锁宿命结局
              </span>
            </div>
            <div className="text-xs sm:text-sm font-serif font-black text-white mt-0.5 truncate">
              {unlockedEnding.title}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
              {unlockedEnding.summary}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-medium cursor-pointer active:scale-95"
            title="重新推演该阶段"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新推演</span>
          </button>

          <button
            onClick={onOpenGallery}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-amber-300 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-medium cursor-pointer active:scale-95"
            title="查看结局回廊"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>宿命图鉴</span>
          </button>

          <button
            onClick={onContinueToStory}
            className="flex-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/50 transition-all hover:scale-[1.02] cursor-pointer active:scale-95"
          >
            <span>进入下一阶段</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
