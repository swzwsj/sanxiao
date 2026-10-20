/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Character,
  ConsultationStage,
  DefensePhase,
  DialogChoice,
  GameEnding,
  Gem,
  Grid,
  InGameQuickChoice,
  PlayerSkill,
  Position,
  SpecialCutIn,
} from './types/game';
import {
  BATTLE_REACTIONS_YANCHEN,
  BATTLE_REACTIONS_YUCHI,
  CHARACTERS,
  GAME_ENDINGS,
  HEROINE_BATTLE_COMMENTS,
  PLAYER_HEROINE,
  PLAYER_SKILLS,
} from './data/characters';
import {
  applyGravityAndRefill,
  calculateComboMultiplier,
  calculateMatchDamage,
  createGem,
  createInitialGrid,
  findMatches,
  getDefensePhase,
  GRID_COLS,
  GRID_ROWS,
  hasPossibleMoves,
  isAdjacent,
  swapGems,
} from './utils/match3Engine';
import { soundManager } from './audio/soundManager';
import { CharacterStage } from './components/CharacterStage';
import { GameBoard } from './components/GameBoard';
import { SkillsBar } from './components/SkillsBar';
import { StoryDialogModal } from './components/StoryDialogModal';
import { VictoryModal } from './components/VictoryModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { SecretDossierModal } from './components/SecretDossierModal';
import { TutorialGuideModal } from './components/TutorialGuideModal';
import { EndingGalleryModal } from './components/EndingGalleryModal';
import { SpecialCutInOverlay } from './components/SpecialCutInOverlay';
import {
  Volume2,
  VolumeX,
  BookOpen,
  FileText,
  Trophy,
  Shield,
  HeartCrack,
  HelpCircle,
  Sparkles,
  RotateCcw,
  FolderLock,
  Flame,
  Image as ImageIcon,
} from 'lucide-react';

export default function App() {
  // Navigation & Character Selection - Default to Pei Yuchi (图2) as requested!
  const [selectedCharId, setSelectedCharId] = useState<'yanchen' | 'yuchi'>('yuchi');
  const [selectedStageId, setSelectedStageId] = useState<number>(1);

  // Unlocked progression records
  const [unlockedStages, setUnlockedStages] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mind_break_unlocked_stages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return { yanchen: 1, yuchi: 1 };
  });

  // Unlocked endings records
  const [unlockedEndingIds, setUnlockedEndingIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('mind_break_unlocked_endings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const activeCharacter = CHARACTERS.find(c => c.id === selectedCharId)!;
  const activeStage = activeCharacter.stages.find(s => s.id === selectedStageId) || activeCharacter.stages[0];

  // Game UI Flow States
  const [gameFlow, setGameFlow] = useState<'INTRO_STORY' | 'BATTLE' | 'VICTORY' | 'VICTORY_STORY' | 'GAME_OVER'>('BATTLE');
  const [activeModal, setActiveModal] = useState<'none' | 'guide' | 'dossier' | 'tutorial' | 'gallery'>('none');
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  // Screen Edge Flash on localCombo >= 3
  const [screenEdgeFlash, setScreenEdgeFlash] = useState<{
    combo: number;
    color: 'amber' | 'rose' | 'purple';
  } | null>(null);

  // Show tutorial on first visit
  useEffect(() => {
    const hasSeen = localStorage.getItem('mind_break_tutorial_seen');
    if (!hasSeen) {
      setActiveModal('tutorial');
    }
  }, []);

  // Battle Combat States
  const [grid, setGrid] = useState<Grid>(() => createInitialGrid());
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hintPositions, setHintPositions] = useState<Position[] | null>(null);

  // Multi-tier Gated Defense Break Phase (0: First lock, 1: Second lock, 2: Final lock)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const [currentDefense, setCurrentDefense] = useState<number>(activeStage.phases[0].maxDefense);
  const [maxDefense, setMaxDefense] = useState<number>(activeStage.phases[0].maxDefense);
  const [turnCount, setTurnCount] = useState(activeStage.turnLimit);
  const [maxTurns, setMaxTurns] = useState(activeStage.turnLimit);

  // Real-time Countdown Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(activeStage.timeLimit);
  const [timeLimit, setTimeLimit] = useState<number>(activeStage.timeLimit);
  const [timeDelta, setTimeDelta] = useState<{ amount: number; key: number } | null>(null);
  const [isBattleFrozen, setIsBattleFrozen] = useState(false);

  const [currentSp, setCurrentSp] = useState(25);
  const [maxSp] = useState(100);
  const [composure, setComposure] = useState(100);
  const [maxComposure] = useState(100);
  const [gimmickCooldown, setGimmickCooldown] = useState(activeCharacter.id === 'yanchen' ? 5 : 4);

  // Feedback & Multipliers
  const [comboCount, setComboCount] = useState(1);
  const [maxComboRecorded, setMaxComboRecorded] = useState(1);
  const [lastMultiplier, setLastMultiplier] = useState(1.0);
  const [bonusTitle, setBonusTitle] = useState('常规消除');
  const [characterDialogText, setCharacterDialogText] = useState<string>('');
  const [isHit, setIsHit] = useState(false);

  // Story Branch Affinity & Unlocked Ending
  const [chosenBranchAffinity, setChosenBranchAffinity] = useState<'submissive' | 'toxic' | 'cold'>('submissive');
  const [currentUnlockedEnding, setCurrentUnlockedEnding] = useState<GameEnding | null>(null);

  // In-battle Cinematic Special Cut-In
  const [specialCutIn, setSpecialCutIn] = useState<SpecialCutIn | null>(null);

  // Male Character Disruptive Enemy Skill Alert Banner
  const [enemySkillAlert, setEnemySkillAlert] = useState<string | null>(null);

  // Dynamic Defense Phase
  const defensePhase: DefensePhase = getDefensePhase(currentDefense, maxDefense);

  // Refs for asynchronous timer and battle loops
  const currentDefenseRef = useRef(currentDefense);
  currentDefenseRef.current = currentDefense;

  const currentPhaseIndexRef = useRef(currentPhaseIndex);
  currentPhaseIndexRef.current = currentPhaseIndex;

  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;

  const composureRef = useRef(composure);
  composureRef.current = composure;

  // Real-time Countdown Timer effect (smooth uninterrupted match-3 battle!)
  useEffect(() => {
    if (gameFlow !== 'BATTLE' || isBattleFrozen) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          clearInterval(interval);
          setGameFlow('GAME_OVER');
          setCharacterDialogText('“时间耗尽！心理攻防战局失衡，本次诊疗强制中断。”');
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameFlow, isBattleFrozen]);

  // Floating time delta badge trigger
  const triggerTimeDelta = (amount: number) => {
    setTimeDelta({ amount, key: Date.now() });
    setTimeout(() => {
      setTimeDelta(null);
    }, 1200);
  };

  // Initialize or Reset stage
  const initStage = useCallback((char: Character, stage: ConsultationStage, buff?: DialogChoice) => {
    const firstLayer = stage.phases[0];
    let startingDef = firstLayer.maxDefense;
    let initialTurns = stage.turnLimit;
    let initialTime = stage.timeLimit;
    let initialSp = 25;

    if (buff) {
      if (buff.bonusSp) initialSp += buff.bonusSp;
      if (buff.defenseDebuff) startingDef = Math.round(startingDef * (1 - buff.defenseDebuff));
      if (buff.mindgameEffect.includes('延长 15 秒')) {
        initialTime += 15;
      }
      if (buff.endingBranchAffinity) {
        setChosenBranchAffinity(buff.endingBranchAffinity);
      }
    }

    const initialG = createInitialGrid();
    if (stage.id >= 2) {
      const coords: Position[] = [];
      for (let r = 1; r < GRID_ROWS - 1; r++) {
        for (let c = 1; c < GRID_COLS - 1; c++) {
          coords.push({ row: r, col: c });
        }
      }
      coords.sort(() => Math.random() - 0.5);
      coords.slice(0, 4).forEach(({ row, col }) => {
        if (initialG[row][col]) {
          initialG[row][col] = { ...initialG[row][col]!, locked: true };
        }
      });
    }
    setGrid(initialG);
    setSelectedPos(null);
    setCurrentPhaseIndex(0);
    currentPhaseIndexRef.current = 0;
    setCurrentDefense(startingDef);
    currentDefenseRef.current = startingDef;
    setMaxDefense(firstLayer.maxDefense);
    setTurnCount(initialTurns);
    setMaxTurns(initialTurns);
    setTimeRemaining(initialTime);
    setTimeLimit(initialTime);
    setTimeDelta(null);
    setCurrentSp(initialSp);
    setComposure(100);
    setGimmickCooldown(char.id === 'yanchen' ? 5 : 4);
    setComboCount(1);
    setMaxComboRecorded(1);
    setLastMultiplier(1.0);
    setBonusTitle('常规消除');
    setCharacterDialogText(`“诊疗启动。当前处于【${firstLayer.name}】，全力撕裂他的伪装！”`);
    setHintPositions(null);
    setIsProcessing(false);
    setIsBattleFrozen(false);
    setSpecialCutIn(null);
    setEnemySkillAlert(null);
    setCurrentUnlockedEnding(null);
    soundManager.startBgm(0);
  }, []);

  // Initialize stage on first load
  useEffect(() => {
    initStage(activeCharacter, activeStage);
  }, []);

  // Switch character - Immediate battle transition with zero dialogue blockage
  const handleSwitchCharacter = (charId: 'yanchen' | 'yuchi') => {
    if (isProcessing) return;
    setSelectedCharId(charId);
    setSelectedStageId(1);
    const targetChar = CHARACTERS.find(c => c.id === charId)!;
    initStage(targetChar, targetChar.stages[0]);
    setGameFlow('BATTLE');
  };

  // Sound toggle
  const handleToggleSound = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  // Switch stage - Immediate battle transition
  const handleSelectStage = (stageId: number) => {
    if (isProcessing) return;
    setSelectedStageId(stageId);
    const targetStage = activeCharacter.stages.find(s => s.id === stageId);
    if (targetStage) {
      initStage(activeCharacter, targetStage);
      setGameFlow('BATTLE');
    }
  };

  // Direct restart battle
  const handleDirectRestart = () => {
    if (isProcessing) return;
    initStage(activeCharacter, activeStage);
    setGameFlow('BATTLE');
  };

  // Trigger special cut-in with configurable duration (中间阶段文案展示延长增加 0.5 秒)
  const triggerCutIn = (cutIn: SpecialCutIn, duration = 1800) => {
    setSpecialCutIn(cutIn);
    setTimeout(() => {
      setSpecialCutIn(null);
    }, duration);
  };

  // Spawn locked chains on entering Phase 2 (二阶段增加被锁住的方块)
  const spawnPhase2LockedChains = () => {
    soundManager.playSpecialExplosion();
    setGrid(prevG => {
      const nextG = prevG.map(r => [...r]);
      const availableCoords: Position[] = [];
      for (let r = 1; r < GRID_ROWS - 1; r++) {
        for (let c = 1; c < GRID_COLS - 1; c++) {
          if (nextG[r][c] && !nextG[r][c]!.locked && nextG[r][c]!.special === 'none') {
            availableCoords.push({ row: r, col: c });
          }
        }
      }
      for (let i = availableCoords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCoords[i], availableCoords[j]] = [availableCoords[j], availableCoords[i]];
      }
      const toLock = availableCoords.slice(0, 5);
      toLock.forEach(({ row, col }) => {
        if (nextG[row][col]) {
          nextG[row][col] = { ...nextG[row][col]!, locked: true };
        }
      });
      return nextG;
    });

    // 延长中间阶段锁链提示文案展示 (+0.5s)
    setEnemySkillAlert('⛓️【第二重心防 · 锁链死锁】心防动摇！5枚宝石已被锁链禁锢，需消除相邻方块方可斩断锁链！');
    setTimeout(() => {
      setEnemySkillAlert(null);
    }, 5000);
  };

  // Immediate Victory Trigger (心防彻底突破后有确定结束点)
  const triggerVictory = (finalCombo: number = 1) => {
    setIsBattleFrozen(true);
    soundManager.stopBgm();
    soundManager.playHeartBreak();

    const effectiveCombo = Math.max(maxComboRecorded, finalCombo);
    const recordedTimeRemaining = Math.max(0, timeRemainingRef.current);
    setTimeRemaining(recordedTimeRemaining);

    const ending = resolveEnding(recordedTimeRemaining, composureRef.current, effectiveCombo);
    setCurrentUnlockedEnding(ending);

    setUnlockedStages(prev => {
      const updated = {
        ...prev,
        [activeCharacter.id]: Math.max(prev[activeCharacter.id] || 1, activeStage.id + 1),
      };
      localStorage.setItem('mind_break_unlocked_stages', JSON.stringify(updated));
      return updated;
    });

    setIsProcessing(true);
    setTimeout(() => {
      setGameFlow('VICTORY');
      setIsProcessing(false);
    }, 500);
  };

  // Apply Phase-Gated Damage Reduction (Multi-tier breakdown: Layer 1 -> Layer 2 -> Layer 3)
  const applyGatedDamage = (rawDamage: number): number => {
    const curDef = currentDefenseRef.current;
    const phaseIdx = currentPhaseIndexRef.current;
    const currentLayer = activeStage.phases[phaseIdx] || activeStage.phases[0];
    const bonusMultiplier = currentLayer.comboDamageBonus || 1.0;
    const effectiveDamage = Math.round(rawDamage * bonusMultiplier);

    let nextDef = curDef - effectiveDamage;

    // Check if current phase layer is defeated!
    if (nextDef <= 0) {
      if (phaseIdx < activeStage.phases.length - 1) {
        // Advance to next deeper mental layer!
        const nextPhaseIdx = phaseIdx + 1;
        const nextLayer = activeStage.phases[nextPhaseIdx];
        setCurrentPhaseIndex(nextPhaseIdx);
        currentPhaseIndexRef.current = nextPhaseIdx;
        soundManager.playHeartBreak();

        // 动态提升BGM至下一阶段紧张度 (Neo-Noir -> Tension Pulse -> Warped Abyss)
        soundManager.updateBgmPhase(nextPhaseIdx);

        // Phase breakthrough rewards
        setCurrentSp(sp => Math.min(maxSp, sp + 35));
        setTimeRemaining(t => Math.min(timeLimit + 15, t + 8.0));
        triggerTimeDelta(8.0);

        // 中间阶段文案展示延长增加 0.5 秒 (1800ms -> 2300ms)
        triggerCutIn({
          id: `phase_break_${nextPhaseIdx}`,
          title: `【心防破裂 · ${nextLayer.name}】`,
          subtitle: nextLayer.subtitle,
          dialogQuote: currentLayer.breakQuote,
          speakerName: activeCharacter.name,
          multiplierText: nextPhaseIdx === 1 ? 'PHASE 2 UNLOCKED' : 'CLIMAX BREAKDOWN',
          color: nextLayer.visualStyle.auraColor,
        }, 2300);

        setCharacterDialogText(currentLayer.breakQuote);

        // Next phase full defense layer
        nextDef = nextLayer.maxDefense;
        setMaxDefense(nextLayer.maxDefense);

        // 阶段二触发专属锁链机制 (锁住5块砖块)
        if (nextPhaseIdx === 1) {
          spawnPhase2LockedChains();
        }
      } else {
        // Final phase depleted! 触发最终胜利结算！
        nextDef = 0;
        triggerVictory(1);
      }
    }

    return nextDef;
  };

  // Fast In-Game Dialogue Quick Response Handler (Non-blocking!)
  const handleSelectQuickChoice = (choice: InGameQuickChoice) => {
    soundManager.playSkillCast();
    if (choice.spGain) {
      setCurrentSp(sp => Math.min(maxSp, sp + choice.spGain!));
    }
    if (choice.timeBonus) {
      setTimeRemaining(t => Math.min(timeLimit + 15, t + choice.timeBonus!));
      triggerTimeDelta(choice.timeBonus);
      soundManager.playTimeBonus();
    }
    if (choice.composureHeal) {
      setComposure(c => Math.min(maxComposure, c + choice.composureHeal!));
    }
    if (choice.defenseDamage) {
      const updated = applyGatedDamage(choice.defenseDamage!);
      currentDefenseRef.current = updated;
      setCurrentDefense(updated);
      checkPhaseDialog(updated, maxDefense);
      setIsHit(true);
      setTimeout(() => setIsHit(false), 200);

      if (updated <= 0 && currentPhaseIndexRef.current >= activeStage.phases.length - 1) {
        triggerVictory(1);
      }
    }

    setCharacterDialogText(`陆星河：“${choice.text}” —— ${choice.reaction}`);
  };

  // Check phase dialog triggers
  const checkPhaseDialog = useCallback((def: number, maxDef: number) => {
    const ratio = def / maxDef;
    if (ratio <= 0) {
      setCharacterDialogText(activeStage.phaseDialogs.at0);
    } else if (ratio <= 0.25) {
      setCharacterDialogText(activeStage.phaseDialogs.at25);
    } else if (ratio <= 0.50) {
      setCharacterDialogText(activeStage.phaseDialogs.at50);
    } else if (ratio <= 0.75) {
      setCharacterDialogText(activeStage.phaseDialogs.at75);
    }
  }, [activeStage]);

  // Determine Branching Ending based on match-3 performance & choices
  const resolveEnding = (remainingTime: number, remainingComposure: number, maxCombo: number): GameEnding => {
    let endingId: string;

    if (activeCharacter.id === 'yanchen') {
      if (remainingTime >= 25 && remainingComposure >= 60 && chosenBranchAffinity === 'submissive') {
        endingId = 'yanchen_submissive';
      } else if (chosenBranchAffinity === 'toxic' || maxCombo >= 4) {
        endingId = 'yanchen_toxic';
      } else {
        endingId = 'yanchen_cold';
      }
    } else {
      if (remainingTime >= 25 && remainingComposure >= 60 && chosenBranchAffinity === 'submissive') {
        endingId = 'yuchi_tamed';
      } else if (chosenBranchAffinity === 'toxic' || maxCombo >= 4) {
        endingId = 'yuchi_racing';
      } else {
        endingId = 'yuchi_stray';
      }
    }

    const ending = GAME_ENDINGS.find(e => e.id === endingId)!;

    // Save unlocked ending to localStorage
    setUnlockedEndingIds(prev => {
      if (!prev.includes(endingId)) {
        const next = [...prev, endingId];
        localStorage.setItem('mind_break_unlocked_endings', JSON.stringify(next));
        return next;
      }
      return prev;
    });

    return ending;
  };

  // Trigger enemy gimmick
  const triggerEnemyGimmick = (currentG: Grid): Grid => {
    const nextGrid = currentG.map(r => [...r]);
    const isYuchi = activeCharacter.id === 'yuchi';

    // Random choice among enemy disruptive skills (打乱或禁止消除部分砖块):
    // 0: 打乱部分砖块 (Scramble 6 tiles)
    // 1: 禁止消除部分砖块 (Lock 3-4 tiles)
    // 2: 冲动心火 / 极度狂暴 (Fire countdown gems)
    const skillRoll = Math.floor(Math.random() * 3);

    if (skillRoll === 0) {
      // 技能一：打乱部分砖块
      const candidates: Position[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (nextGrid[r][c] && !nextGrid[r][c]!.locked && nextGrid[r][c]!.special === 'none') {
            candidates.push({ row: r, col: c });
          }
        }
      }
      if (candidates.length >= 6) {
        const toShuffle: Position[] = [];
        for (let i = 0; i < 6 && candidates.length > 0; i++) {
          const randIdx = Math.floor(Math.random() * candidates.length);
          toShuffle.push(candidates.splice(randIdx, 1)[0]);
        }
        const gemsToSwap = toShuffle.map(p => nextGrid[p.row][p.col]);
        for (let i = 0; i < toShuffle.length; i++) {
          const nextIdx = (i + 1) % toShuffle.length;
          nextGrid[toShuffle[nextIdx].row][toShuffle[nextIdx].col] = gemsToSwap[i];
        }
        soundManager.playSpecialExplosion();
        setEnemySkillAlert(isYuchi ? '⚠️ 裴予迟 发动【狂野掀桌】！打乱了局部盘面！' : '⚠️ 裴宴臣 发动【商战洗牌】！强制打乱心绪宝石！');
        setCharacterDialogText(isYuchi ? '“姐姐，别以为只有你能掌控节奏！给我乱起来吧！”' : '“三年前的棋局是你定的，但今天……由我掀翻它！”');
        setTimeout(() => setEnemySkillAlert(null), 2600);
      }
    } else if (skillRoll === 1) {
      // 技能二：禁止消除部分砖块 (冰封锁定 3 颗宝石)
      const candidates: Position[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (nextGrid[r][c] && !nextGrid[r][c]!.locked) {
            candidates.push({ row: r, col: c });
          }
        }
      }
      const count = Math.min(3, candidates.length);
      for (let i = 0; i < count; i++) {
        const randIdx = Math.floor(Math.random() * candidates.length);
        const { row, col } = candidates.splice(randIdx, 1)[0];
        nextGrid[row][col] = { ...nextGrid[row][col]!, locked: true };
      }
      soundManager.playPenaltyBuzz();
      setEnemySkillAlert(isYuchi ? '❄️ 裴予迟 发动【极寒心锁】！禁止消除 3 颗关键宝石！' : '❄️ 裴宴臣 发动【执念死锁】！封禁 3 颗心绪宝石！');
      setCharacterDialogText(isYuchi ? '“这些心事……你想都别想轻易抹去！给我老老实实看着！”' : '“碰不到我的软肋了吧，陆医生？继续看穿我啊！”');
      setTimeout(() => setEnemySkillAlert(null), 2600);
    } else {
      // 技能三：心火点燃
      const candidates: Position[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (nextGrid[r][c] && nextGrid[r][c]!.fireCountdown === undefined && !nextGrid[r][c]!.locked) {
            candidates.push({ row: r, col: c });
          }
        }
      }
      const count = Math.min(2, candidates.length);
      for (let i = 0; i < count; i++) {
        const randIdx = Math.floor(Math.random() * candidates.length);
        const { row, col } = candidates.splice(randIdx, 1)[0];
        nextGrid[row][col] = { ...nextGrid[row][col]!, fireCountdown: 3 };
      }
      soundManager.playSpecialExplosion();
      setEnemySkillAlert(isYuchi ? '🔥 裴予迟 发动【冲动心火】！点燃 2 颗倒计时炸弹！' : '🔥 裴宴臣 妒火中烧！点燃 2 颗倒计时心魔！');
      setCharacterDialogText(isYuchi ? '“我的心跳快要着火了……你最好在它炸开前浇灭我！”' : '“看着我的眼睛……不准去想别的男人！”');
      setTimeout(() => setEnemySkillAlert(null), 2600);
    }

    return nextGrid;
  };

  // Update fire countdowns
  const updateFireCountdowns = (currentG: Grid): { newGrid: Grid; explosionDamage: number } => {
    const nextGrid = currentG.map(r => [...r]);
    let explosionDamage = 0;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const gem = nextGrid[r][c];
        if (gem && typeof gem.fireCountdown === 'number') {
          if (gem.fireCountdown <= 1) {
            nextGrid[r][c] = null;
            explosionDamage += 25;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                  nextGrid[nr][nc] = null;
                }
              }
            }
          } else {
            nextGrid[r][c] = { ...gem, fireCountdown: gem.fireCountdown - 1 };
          }
        }
      }
    }

    return { newGrid: nextGrid, explosionDamage };
  };

  // Main Cascade Resolution Loop
  const resolveBoardCascades = async (initialGrid: Grid, initialMatches: ReturnType<typeof findMatches>) => {
    let currentG = initialGrid.map(row => [...row]);
    let matches = initialMatches;
    let localCombo = 1;

    while (matches.length > 0) {
      setComboCount(localCombo);
      setMaxComboRecorded(prev => Math.max(prev, localCombo));

      const currentPhase = getDefensePhase(currentDefenseRef.current, maxDefense);
      const { multiplier, bonusTitle: bTitle } = calculateComboMultiplier(currentPhase, localCombo);

      setLastMultiplier(multiplier);
      setBonusTitle(bTitle);

      soundManager.playComboAscending(localCombo);

      // Reward time for successful match/combo
      const timeBonus = Math.min(3.5, 1.5 + (localCombo - 1) * 0.5);
      setTimeRemaining(prev => Math.min(timeLimit + 15, prev + timeBonus));
      triggerTimeDelta(timeBonus);
      soundManager.playTimeBonus();

      // 当 localCombo 达到 3 或以上时，触发屏幕边缘闪烁特效
      if (localCombo >= 3) {
        const flashColor: 'amber' | 'rose' | 'purple' = localCombo >= 5 ? 'purple' : localCombo === 4 ? 'rose' : 'amber';
        setScreenEdgeFlash({ combo: localCombo, color: flashColor });
        setTimeout(() => {
          setScreenEdgeFlash(null);
        }, 550);
      }

      const toDelete = new Set<string>();
      let spGained = 0;
      let compGained = 0;
      let hasSpecialExplosion = false;

      for (const match of matches) {
        // High-match drama cut-in triggers
        if (match.matches.length >= 5) {
          triggerCutIn({
            id: 'cutin_eye',
            title: '恶女之瞳 · 绝对操纵',
            subtitle: '神级五连消！支配力达峰',
            dialogQuote: activeCharacter.id === 'yanchen' ? '“只要是你……哪怕把我的灵魂掏空，我也心甘情愿……”' : '“姐姐……不要抛弃我，让我当你的狗也行……”',
            speakerName: activeCharacter.name,
            multiplierText: '5-MATCH OVERLOAD',
            color: '#fbbf24',
          });
          hasSpecialExplosion = true;
        }

        for (const pos of match.matches) {
          toDelete.add(`${pos.row},${pos.col}`);
          const gem = currentG[pos.row][pos.col];
          if (!gem) continue;

          // Resource utility gains per gem
          switch (gem.type) {
            case 'seduction':
              spGained += 1;
              break;
            case 'hypnosis':
              compGained += 1;
              break;
            case 'empathy':
              compGained += 2;
              break;
            case 'desire':
              spGained += 2;
              break;
            case 'trauma':
              spGained += 1;
              break;
          }

          if (gem.special === 'line_h') {
            soundManager.playSpecialExplosion();
            for (let c = 0; c < GRID_COLS; c++) toDelete.add(`${pos.row},${c}`);
            hasSpecialExplosion = true;
          } else if (gem.special === 'line_v') {
            soundManager.playSpecialExplosion();
            for (let r = 0; r < GRID_ROWS; r++) toDelete.add(`${r},${pos.col}`);
            hasSpecialExplosion = true;
          } else if (gem.special === 'bomb') {
            soundManager.playSpecialExplosion();
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = pos.row + dr;
                const nc = pos.col + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                  toDelete.add(`${nr},${nc}`);
                }
              }
            }
            hasSpecialExplosion = true;
          }

          const neighbors = [
            { r: pos.row - 1, c: pos.col },
            { r: pos.row + 1, c: pos.col },
            { r: pos.row, c: pos.col - 1 },
            { r: pos.row, c: pos.col + 1 },
          ];
          neighbors.forEach(n => {
            if (n.r >= 0 && n.r < GRID_ROWS && n.c >= 0 && n.c < GRID_COLS) {
              const neighborGem = currentG[n.r][n.c];
              if (neighborGem?.locked) {
                currentG[n.r][n.c] = { ...neighborGem, locked: false };
              }
            }
          });
        }
      }

      // 玩家定制精准伤害公式：
      // 1消只能扣除1点。连消+1点，连锁消除 *2 或 *3。
      const { damage: finalStepDamage, multiplier: stepMultiplier, bonusTitle: stepBonusTitle } =
        calculateMatchDamage(localCombo, hasSpecialExplosion);

      setLastMultiplier(stepMultiplier);
      setBonusTitle(stepBonusTitle);

      const nextDef = applyGatedDamage(finalStepDamage);
      currentDefenseRef.current = nextDef;
      setCurrentDefense(nextDef);
      checkPhaseDialog(nextDef, maxDefense);

      if (nextDef <= 0 && currentPhaseIndexRef.current >= activeStage.phases.length - 1) {
        triggerVictory(localCombo);
        return;
      }

      setCurrentSp(prev => Math.min(maxSp, prev + spGained));
      setComposure(prev => Math.min(maxComposure, prev + compGained));

      setIsHit(true);
      setTimeout(() => setIsHit(false), 150);

      // 1. 触发消除爆裂动画 (isMatching: true)
      toDelete.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        if (currentG[r][c]) {
          currentG[r][c] = { ...currentG[r][c]!, isMatching: true };
        }
      });
      setGrid(currentG.map(r => [...r]));
      await new Promise(r => setTimeout(r, 200));

      // 2. 清理消除宝石并生成心魔秘宝
      toDelete.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        currentG[r][c] = null;
      });

      for (const match of matches) {
        if (match.specialToCreate) {
          const { pos, special } = match.specialToCreate;
          currentG[pos.row][pos.col] = createGem(match.type, special);
        }
      }

      setGrid(currentG.map(r => [...r]));
      await new Promise(r => setTimeout(r, 120));

      const { newGrid } = applyGravityAndRefill(currentG);
      currentG = newGrid;
      setGrid(currentG.map(r => [...r]));

      matches = findMatches(currentG);
      if (matches.length > 0) {
        localCombo++;
      }
    }

    // Check Victory (0 Defense in final phase)
    if (currentDefenseRef.current <= 0 && currentPhaseIndexRef.current >= activeStage.phases.length - 1) {
      soundManager.playHeartBreak();

      // Resolve ending branch
      const ending = resolveEnding(timeRemainingRef.current, composureRef.current, localCombo);
      setCurrentUnlockedEnding(ending);

      setUnlockedStages(prev => {
        const updated = {
          ...prev,
          [activeCharacter.id]: Math.max(prev[activeCharacter.id] || 1, activeStage.id + 1),
        };
        localStorage.setItem('mind_break_unlocked_stages', JSON.stringify(updated));
        return updated;
      });

      setTimeout(() => {
        setGameFlow('VICTORY');
      }, 700);
      return;
    }

    // End of Turn Check
    let nextTurns = turnCount - 1;
    setTurnCount(nextTurns);

    let nextG = currentG.map(r => [...r]);

    // Handle Fire Countdown Tick
    const { newGrid: firedGrid, explosionDamage } = updateFireCountdowns(nextG);
    nextG = firedGrid;
    if (explosionDamage > 0) {
      soundManager.playSpecialExplosion();
      setComposure(prev => Math.max(0, prev - explosionDamage));
      setTimeRemaining(prev => Math.max(0, prev - 4.0));
      triggerTimeDelta(-4.0);
      setCharacterDialogText('“浪子心火爆发！诊所遭受反噬，从容度重创并扣除4秒时限！”');
    }

    // Handle Enemy Gimmick Cooldown Tick
    if (gimmickCooldown <= 1) {
      soundManager.playHeartBreak();
      nextG = triggerEnemyGimmick(nextG);
      setGimmickCooldown(activeCharacter.id === 'yanchen' ? 5 : 4);
    } else {
      setGimmickCooldown(prev => prev - 1);
    }

    const { newGrid: postRefilledGrid } = applyGravityAndRefill(nextG);
    nextG = postRefilledGrid;

    // Check Legal Moves - reshuffle if deadlocked
    if (!hasPossibleMoves(nextG)) {
      nextG = createInitialGrid();
      setCharacterDialogText('“棋盘陷入思维僵局，已自动重塑心智网格。”');
    }

    setGrid(nextG);
    setIsProcessing(false);

    if (nextTurns <= 0 && currentDefenseRef.current > 0) {
      setGameFlow('GAME_OVER');
      setCharacterDialogText('“步数耗尽！男主重筑了心防面具，本次治疗失败。”');
    }
  };

  // Handle Tile Selection
  const handleSelectPos = (pos: Position) => {
    if (isProcessing) return;
    if (pos.row === -1) {
      setSelectedPos(null);
      return;
    }
    soundManager.playGemSelect();
    setSelectedPos(pos);
  };

  // Handle Gem Swap
  const handleSwap = async (from: Position, to: Position) => {
    if (isProcessing) return;
    if (!isAdjacent(from, to)) {
      setSelectedPos(to);
      return;
    }

    const fromGem = grid[from.row][from.col];
    const toGem = grid[to.row][to.col];
    if (fromGem?.locked || toGem?.locked) {
      soundManager.playPenaltyBuzz();
      setCharacterDialogText('“该宝石被心魔锁链死死缠绕，无法直接移动！请先消除相邻宝石解除锁链！”');
      setSelectedPos(null);
      return;
    }

    setIsProcessing(true);
    setSelectedPos(null);
    setHintPositions(null);
    soundManager.playGemSwap();

    const swapped = swapGems(grid, from, to);
    setGrid(swapped);

    await new Promise(r => setTimeout(r, 160));

    const matches = findMatches(swapped);

    if (matches.length === 0) {
      // Invalid swap penalty
      soundManager.playPenaltyBuzz();
      setTimeRemaining(prev => Math.max(0, prev - 3.0));
      triggerTimeDelta(-3.0);
      setComposure(prev => Math.max(0, prev - 8));
      const heroineJoke = HEROINE_BATTLE_COMMENTS.invalidMove[Math.floor(Math.random() * HEROINE_BATTLE_COMMENTS.invalidMove.length)];
      setCharacterDialogText(`“无效交换！扣除 3 秒时限与 8 点从容度。（陆星河：“${heroineJoke}”）”`);

      // Revert swap
      const reverted = swapGems(swapped, from, to);
      setGrid(reverted);
      setIsProcessing(false);
      return;
    }

    // Resolve cascades
    await resolveBoardCascades(swapped, matches);
  };

  // Cast Player Skill
  const handleCastSkill = async (skill: (typeof PLAYER_SKILLS)[0]) => {
    if (isProcessing || currentSp < skill.spCost) return;

    soundManager.playSkillCast();
    setCurrentSp(prev => prev - skill.spCost);
    setIsProcessing(true);

    triggerCutIn({
      id: `skill_${skill.id}`,
      title: `【${skill.name}】`,
      subtitle: skill.description,
      dialogQuote: skill.flavor,
      speakerName: PLAYER_HEROINE.name,
      multiplierText: 'SKILL ACTIVATED',
      color: '#e11d48',
    });

    const nextG = grid.map(r => [...r]);

    // Cast skill cleanses all frozen locks inflicted by enemy!
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (nextG[r][c]?.locked) {
          nextG[r][c] = { ...nextG[r][c]!, locked: false };
        }
      }
    }

    if (skill.id === 'seduction_transference') {
      let changed = 0;
      for (let r = 0; r < GRID_ROWS && changed < 4; r++) {
        for (let c = 0; c < GRID_COLS && changed < 4; c++) {
          if (nextG[r][c] && nextG[r][c]!.type !== 'seduction') {
            nextG[r][c] = { ...nextG[r][c]!, type: 'seduction' };
            changed++;
          }
        }
      }
      setGrid(nextG);
      await new Promise(r => setTimeout(r, 200));
      const matches = findMatches(nextG);
      await resolveBoardCascades(nextG, matches);
    } else if (skill.id === 'trauma_regression') {
      soundManager.playSpecialExplosion();
      for (let r = 2; r <= 4; r++) {
        for (let c = 2; c <= 4; c++) {
          nextG[r][c] = null;
        }
      }
      const nextDef = applyGatedDamage(5);
      currentDefenseRef.current = nextDef;
      setCurrentDefense(nextDef);
      checkPhaseDialog(nextDef, maxDefense);

      if (nextDef <= 0 && currentPhaseIndexRef.current >= activeStage.phases.length - 1) {
        triggerVictory(comboCount);
        return;
      }
      setGrid(nextG);
      await new Promise(r => setTimeout(r, 200));
      const { newGrid } = applyGravityAndRefill(nextG);
      setGrid(newGrid);
      const matches = findMatches(newGrid);
      await resolveBoardCascades(newGrid, matches);
    } else if (skill.id === 'hypnosis_stasis') {
      const positions: Position[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) positions.push({ row: r, col: c });
      }
      for (let i = 0; i < 12 && positions.length > 0; i++) {
        const idx = Math.floor(Math.random() * positions.length);
        const { row, col } = positions.splice(idx, 1)[0];
        nextG[row][col] = null;
      }
      setGimmickCooldown(prev => prev + 2);
      setComposure(prev => Math.min(maxComposure, prev + 25));
      setTimeRemaining(prev => Math.min(timeLimit + 15, prev + 6.0));
      triggerTimeDelta(6.0);
      setGrid(nextG);
      await new Promise(r => setTimeout(r, 200));
      const { newGrid } = applyGravityAndRefill(nextG);
      setGrid(newGrid);
      const matches = findMatches(newGrid);
      await resolveBoardCascades(newGrid, matches);
    } else if (skill.id === 'femme_fatale_kiss') {
      const pierceDmg = 12;
      soundManager.playHeartBreak();
      const nextDef = applyGatedDamage(pierceDmg);
      currentDefenseRef.current = nextDef;
      setCurrentDefense(nextDef);
      checkPhaseDialog(nextDef, maxDefense);
      setIsHit(true);
      setTimeout(() => setIsHit(false), 250);
      setIsProcessing(false);

      if (nextDef <= 0 && currentPhaseIndexRef.current >= activeStage.phases.length - 1) {
        triggerVictory(comboCount);
      }
    }
  };

  // Find Hint
  const handleFindHint = () => {
    if (isProcessing) return;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (c + 1 < GRID_COLS) {
          const testG = swapGems(grid, { row: r, col: c }, { row: r, col: c + 1 });
          if (findMatches(testG).length > 0) {
            setHintPositions([
              { row: r, col: c },
              { row: r, col: c + 1 },
            ]);
            return;
          }
        }
        if (r + 1 < GRID_ROWS) {
          const testG = swapGems(grid, { row: r, col: c }, { row: r + 1, col: c });
          if (findMatches(testG).length > 0) {
            setHintPositions([
              { row: r, col: c },
              { row: r + 1, col: c },
            ]);
            return;
          }
        }
      }
    }
  };

  useEffect(() => {
    initStage(activeCharacter, activeStage);
  }, [activeCharacter, activeStage, initStage]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Wordmark & Lu Xinghe Heroine Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.35)] shrink-0 bg-zinc-900">
            <img
              src="/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg"
              alt="陆星河"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-black text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                心防崩解：支配契约
              </span>
              <span className="text-[10px] text-rose-300 font-bold px-1.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-700/60 hidden sm:inline">
                陆星河 · 执网者
              </span>
            </div>
            <span className="text-zinc-500 text-[10px] hidden md:inline">
              深渊与茧私人诊所 · 心理攻防档案
            </span>
          </div>
        </div>

        {/* Zone 2: Character switch & Steam Mirror navigation */}
        <nav className="hidden lg:flex items-center gap-3 text-xs font-medium text-zinc-300">
          <button
            onClick={() => handleSwitchCharacter('yuchi')}
            className={`transition-all whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              selectedCharId === 'yuchi'
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-200 font-bold shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-900'
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-rose-500/70 shrink-0">
              <img
                src="/assets/aistudio/ff5b0d44690e58b29adf27c2e1c5ec53_edd7ce8f.jpg"
                alt="裴予迟"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <span>图2 · 裴予迟 (男主)</span>
          </button>

          <button
            onClick={() => handleSwitchCharacter('yanchen')}
            className={`transition-all whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              selectedCharId === 'yanchen'
                ? 'bg-purple-950/80 border-purple-500/80 text-purple-200 font-bold shadow-[0_0_15px_rgba(192,38,211,0.35)]'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-900'
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-purple-500/70 shrink-0">
              <img
                src="/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg"
                alt="陆星河"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <span>图1 · 陆星河 (执网者)</span>
          </button>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          <button
            onClick={() => setActiveModal('gallery')}
            className="text-zinc-400 hover:text-amber-300 transition-colors whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-900/60 text-xs"
            title="结局图鉴"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>图鉴 ({unlockedEndingIds.length}/6)</span>
          </button>

          <button
            onClick={() => setActiveModal('dossier')}
            className="text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-900/60 text-xs"
            title="绝密病历"
          >
            <FolderLock className="w-3.5 h-3.5 text-zinc-400" />
            <span>档案</span>
          </button>

          <button
            onClick={() => setActiveModal('tutorial')}
            className="text-rose-400 hover:text-rose-300 transition-colors whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-rose-950/30 text-xs font-semibold"
            title="诊疗规则"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>规则</span>
          </button>
        </nav>

        {/* Zone 3: Actions & sound (Iconic) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shadow-sm"
            title={isMuted ? '开启音效' : '静音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            onClick={handleDirectRestart}
            className="px-3 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-500 transition-all shadow-md shadow-rose-950/60 flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 cursor-pointer"
            title="重开诊疗对决"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置</span>
          </button>
        </div>
      </header>

      {/* Steam Mirror Design Dual-Pane Battle Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3">
        {/* Top Sub-Bar: Iconic Stage Selector & Mind Defense Lock Stage */}
        <div className="w-full flex items-center justify-between pb-2 mb-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">阶段：</span>
            {activeCharacter.stages.map((stg) => {
              const maxUnlocked = unlockedStages[activeCharacter.id] || 1;
              const isAvailable = stg.id <= maxUnlocked;
              const isCurrent = selectedStageId === stg.id;

              return (
                <button
                  key={stg.id}
                  disabled={!isAvailable}
                  onClick={() => handleSelectStage(stg.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold shadow-sm'
                      : isAvailable
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <span className="text-[10px] text-amber-400 font-serif">✦</span>
                  <span>第 {stg.id} 阶段</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-amber-300 font-mono flex items-center gap-1.5 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>心防锁：第 {currentPhaseIndex + 1}/{activeStage.phases.length} 重攻坚</span>
          </div>
        </div>

        {/* Steam Mirror Design Side-by-Side Arena (Left: GameBoard & Bottom Heroine HUD, Right: Character Visual Stage) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Match-3 GameBoard & Bottom-Left Heroine Circular HUD (7 cols on lg/xl, exactly like Mirror) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <GameBoard
              grid={grid}
              selectedPos={selectedPos}
              onSelectPos={handleSelectPos}
              onSwap={handleSwap}
              isProcessing={isProcessing}
              onHint={handleFindHint}
              hintPositions={hintPositions}
              comboCount={comboCount}
              lastMultiplier={lastMultiplier}
              bonusTitle={bonusTitle}
            />

            <SkillsBar
              currentSp={currentSp}
              maxSp={maxSp}
              onCastSkill={handleCastSkill}
              isProcessing={isProcessing}
              composure={composure}
              maxComposure={maxComposure}
            />
          </div>

          {/* RIGHT COLUMN: Steam Mirror Character Stage with Top Defense Bar & Flaming Gimmick Orb (5 cols on lg/xl) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <CharacterStage
              character={activeCharacter}
              currentDefense={currentDefense}
              maxDefense={maxDefense}
              phase={defensePhase}
              activeDialogText={characterDialogText}
              isHit={isHit}
              gimmickCooldown={gimmickCooldown}
              turnCount={turnCount}
              maxTurns={maxTurns}
              timeRemaining={timeRemaining}
              timeLimit={timeLimit}
              timeDelta={timeDelta}
              currentPhaseIndex={currentPhaseIndex}
              phases={activeStage.phases}
              onSelectQuickChoice={handleSelectQuickChoice}
              enemySkillAlert={enemySkillAlert}
            />
          </div>
        </div>
      </main>

      {/* Special Cut-In Dramatics Overlay */}
      <SpecialCutInOverlay cutIn={specialCutIn} />

      {/* VN Dialogue Scene: Pre-Battle Intro */}
      {gameFlow === 'INTRO_STORY' && (
        <StoryDialogModal
          title={`${activeCharacter.name} · ${activeStage.title}`}
          scene={activeStage.introDialog}
          onComplete={(chosenBuff) => {
            initStage(activeCharacter, activeStage, chosenBuff);
            setGameFlow('BATTLE');
          }}
        />
      )}

      {/* VN Dialogue Scene: Post-Battle Climax Victory Story */}
      {gameFlow === 'VICTORY_STORY' && (
        <StoryDialogModal
          title={`${activeCharacter.name} · 彻底臣服诊疗记录`}
          scene={activeStage.victoryDialog}
          onComplete={() => {
            const nextStageId = selectedStageId + 1;
            const nextExists = activeCharacter.stages.some(s => s.id === nextStageId);
            if (nextExists) {
              setSelectedStageId(nextStageId);
              setGameFlow('INTRO_STORY');
            } else {
              setGameFlow('BATTLE');
              setActiveModal('gallery');
            }
          }}
        />
      )}

      {/* Mirror-Style Victory Climax Modal */}
      {gameFlow === 'VICTORY' && (
        <VictoryModal
          character={activeCharacter}
          stage={activeStage}
          maxCombo={maxComboRecorded}
          totalDamage={activeStage.startingDefense}
          turnsRemaining={turnCount}
          timeRemaining={timeRemaining}
          timeLimit={timeLimit}
          composure={composure}
          unlockedEnding={currentUnlockedEnding}
          onContinueToStory={() => {
            const nextStageId = selectedStageId + 1;
            const nextExists = activeCharacter.stages.some(s => s.id === nextStageId);
            if (nextExists) {
              setSelectedStageId(nextStageId);
              const nextStg = activeCharacter.stages.find(s => s.id === nextStageId)!;
              initStage(activeCharacter, nextStg);
              setGameFlow('BATTLE');
            } else {
              initStage(activeCharacter, activeStage);
              setGameFlow('BATTLE');
              setActiveModal('gallery');
            }
          }}
          onRetry={() => {
            initStage(activeCharacter, activeStage);
            setGameFlow('BATTLE');
          }}
          onOpenDossier={() => setActiveModal('dossier')}
          onOpenGallery={() => setActiveModal('gallery')}
        />
      )}

      {/* Game Over Modal (Turn Exhausted or Time Limit Reached) */}
      {gameFlow === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-red-500/50 rounded-2xl p-6 text-center shadow-2xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 mb-3">
              <HeartCrack className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-zinc-100 mb-2">
              诊疗时限耗尽 · 心理防线失守
            </h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              男主的心防尚未完全攻克，且由于超时或频繁无效尝试，主治医师的从容度受到反噬。是否立即重整旗鼓，再次撕裂他的伪装？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  initStage(activeCharacter, activeStage);
                  setGameFlow('BATTLE');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-lg shadow-rose-950"
              >
                再次发起心理攻防
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beginner Onboarding Tutorial Modal */}
      {activeModal === 'tutorial' && (
        <TutorialGuideModal onClose={() => setActiveModal('none')} />
      )}

      {/* Endings Gallery Modal */}
      {activeModal === 'gallery' && (
        <EndingGalleryModal
          onClose={() => setActiveModal('none')}
          unlockedEndingIds={unlockedEndingIds}
        />
      )}

      {/* How To Play Modal */}
      {activeModal === 'guide' && (
        <HowToPlayModal onClose={() => setActiveModal('none')} />
      )}

      {/* Secret Dossier Modal */}
      {activeModal === 'dossier' && (
        <SecretDossierModal
          onClose={() => setActiveModal('none')}
          unlockedStages={unlockedStages}
        />
      )}

      {/* Screen Edge Flash Visual Feedback for Combo >= 3 */}
      {screenEdgeFlash && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 animate-in fade-in"
          style={{
            boxShadow:
              screenEdgeFlash.color === 'purple'
                ? 'inset 0 0 130px rgba(168, 85, 247, 0.9), inset 0 0 50px rgba(236, 72, 153, 0.95), inset 0 0 20px rgba(255, 255, 255, 0.9)'
                : screenEdgeFlash.color === 'rose'
                ? 'inset 0 0 110px rgba(244, 63, 94, 0.9), inset 0 0 45px rgba(239, 68, 68, 0.95)'
                : 'inset 0 0 90px rgba(245, 158, 11, 0.85), inset 0 0 35px rgba(251, 191, 36, 0.9)',
          }}
        >
          {/* Edge Vignette Light Flares */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-amber-500/25 via-rose-500/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-red-600/30 via-rose-500/10 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-amber-500/20 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-rose-500/20 to-transparent pointer-events-none" />

          {/* Floating High-Combo Energy Callout */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/90 border border-amber-400/90 shadow-[0_0_30px_rgba(245,158,11,0.9)] backdrop-blur-md flex items-center gap-2 animate-bounce">
            <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-amber-200">
              COMBO x{screenEdgeFlash.combo} 连锁震荡
            </span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}
