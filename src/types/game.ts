export type GemType = 'seduction' | 'hypnosis' | 'empathy' | 'desire' | 'trauma';

export type SpecialType = 'none' | 'line_h' | 'line_v' | 'bomb' | 'eye';

export interface Gem {
  id: string;
  type: GemType;
  special: SpecialType;
  locked?: boolean; // 心魔锁链 (needs adjacent match)
  fireCountdown?: number; // 浪子心火 (turns before explosion)
  isMatching?: boolean;
  isNew?: boolean;
}

export type Grid = (Gem | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface MatchResult {
  matches: Position[];
  type: GemType;
  specialToCreate?: {
    pos: Position;
    special: SpecialType;
  };
}

export type DefensePhase = 'guarded' | 'wavering' | 'breakdown' | 'submissive';

export interface InGameQuickChoice {
  tag: string; // e.g. "直击软肋" | "耳畔低语" | "冰冷威慑"
  text: string;
  bonusText: string; // e.g. "-3心防, +15SP"
  defenseDamage?: number;
  spGain?: number;
  timeBonus?: number;
  composureHeal?: number;
  reaction: string;
}

// Multi-Tier Defense Breakdown Phase (Cannot be defeated all at once!)
export interface StageDefensePhase {
  phaseIndex: number; // 0: 第一重心防, 1: 第二重心防, 2: 第三重心防(绝顶)
  name: string; // e.g. "第一重：假面铠甲", "第二重：心渊动摇", "第三重：极乐沦陷"
  subtitle: string;
  maxDefense: number; // Defense for this specific layer
  visualStyle: {
    dishevelLevel: number; // 0: Neat/Formal, 1: Loosened/Flustered, 2: Wide Open/Tearful
    blushOpacity: number; // 0, 0.45, 0.9
    auraColor: string; // CSS color string
    ecgBaseBpm: number; // 75, 125, 185
    expressionBadge: string; // "冷峻伪装", "理智动摇", "病娇臣服"
  };
  breakQuote: string; // Spoken when this phase is crushed
  perkDescription: string; // e.g. "连锁消除伤害 +40%", "暴击率翻倍"
  comboDamageBonus: number; // Multiplier added to match-3 cascades in this phase
  phaseDialogue?: string; // Phase dynamic voice line
  quickChoices?: InGameQuickChoice[]; // Fast 1-click in-game choices without blocking board
}

export interface ConsultationStage {
  id: number;
  title: string;
  subtitle: string;
  turnLimit: number;
  timeLimit: number; // In seconds (e.g. 75s)
  startingDefense: number;
  phases: StageDefensePhase[]; // Multi-phase breakdown layers!
  passiveGimmick: string;
  introDialog: DialogScene;
  victoryDialog: DialogScene;
  phaseDialogs: {
    at75: string;
    at50: string;
    at25: string;
    at0: string;
  };
  unlockedDossierText: string;
}

export interface Character {
  id: 'yanchen' | 'yuchi';
  name: string;
  title: string;
  age: number;
  identity: string;
  archetype: string;
  description: string;
  secretTrait: string;
  themeColor: string;
  accentColor: string;
  portraitUrl?: string;
  maxDefense: number;
  stages: ConsultationStage[];
}

export interface DialogChoice {
  text: string;
  mindgameEffect: string; // e.g. "初始SP+30", "心防弱化15%"
  bonusSp?: number;
  defenseDebuff?: number; // Percentage
  reaction: string;
  endingBranchAffinity?: 'submissive' | 'toxic' | 'cold';
}

export interface DialogScene {
  characterName: string;
  lines: {
    speaker: 'lu_xinghe' | 'target' | 'narrator';
    text: string;
    expression?: 'calm' | 'smirk' | 'cold' | 'shock' | 'blush' | 'crazy';
  }[];
  choice?: {
    prompt: string;
    options: DialogChoice[];
  };
}

export interface PlayerSkill {
  id: string;
  name: string;
  spCost: number;
  description: string;
  flavor: string;
  iconName: string;
}

export interface SpecialCutIn {
  id: string;
  title: string;
  subtitle: string;
  dialogQuote: string;
  speakerName: string;
  multiplierText: string;
  color: string;
}

export type EndingId =
  | 'yanchen_submissive'
  | 'yanchen_toxic'
  | 'yanchen_cold'
  | 'yuchi_tamed'
  | 'yuchi_racing'
  | 'yuchi_stray';

export interface GameEnding {
  id: EndingId;
  characterId: 'yanchen' | 'yuchi';
  title: string;
  tag: string; // e.g. "S级·真支配结局", "A级·共狂结局"
  summary: string;
  epilogueLines: {
    speaker: string;
    text: string;
  }[];
  conditionDescription: string;
}

export interface TutorialStep {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  highlightTarget: 'grid' | 'defense' | 'timer' | 'composure' | 'skills';
  tip: string;
}

// Psychological Crisis Encounter System Types
export interface CrisisChoice {
  text: string;
  strategyType: 'dominate' | 'seduce' | 'expose';
  effectDesc: string;
  spGain?: number;
  timeBonus?: number;
  composureHeal?: number;
  defenseDamage?: number;
  reaction: string;
}

export interface CrisisEvent {
  id: string;
  title: string;
  situation: string;
  targetQuote: string;
  speakerName: string;
  timeLimitSeconds: number;
  choices: CrisisChoice[];
}
