import type { ClearFeedback, Grid, Position } from './game';
export type Approach = 'direct' | 'patient';
export type Response = 'press' | 'reassure';
export type BattleStatus = 'ready' | 'playing' | 'resolving' | 'finished';
export type Outcome = 'success' | 'partial' | 'failure';
export type FinishReason = 'defense_broken' | 'turn_limit' | 'time_limit' | 'composure';
export interface DialogueLine { speaker: 'heroine' | 'target'; text: string; }
export interface BattleStory { id: number; phaseIndex: number; lineIndex: number; lines: DialogueLine[]; }
export interface DemoConfig {
  id: string;
  sceneId: string;
  title: string;
  objective: string;
  /** Null creates a fresh board per attempt. A number opts into reproducible play. */
  seed: number | null;
  turns: number;
  /** Null uses a turn budget; a number enables an explicitly timed encounter. */
  timeLimitSeconds: number | null;
  phases: { name: string; defense: number; quote: string; dialogue?: DialogueLine[] }[];
  breakProgress: { initial: number; successGain: number; maximum: number };
  nextNode: { id: string; title: string };
  /** Reserved for the film project. Empty URLs display a labelled still-frame slot. */
  media: { before: string; after: Record<Outcome, string> };
}
export interface BattleResult {
  version: 1;
  runId: string;
  battleId: string;
  sceneId: string;
  seed: number;
  outcome: Outcome;
  reason: FinishReason;
  grade: 'S' | 'A' | 'B' | 'C';
  approach: Approach;
  /** Reserved for older film integrations; current battles contain no mid-battle choices. */
  response: Response | null;
  phasesCleared: number;
  turnsUsed: number;
  turnsRemaining: number;
  maxCombo: number;
  composure: number;
  activeTimeMs: number;
  storyFlags: string[];
  continuationId: string;
  progressBefore: number;
  progressDelta: number;
  breakProgress: number;
  nextNodeId: string;
}
export interface BattleState {
  runId: string;
  seed: number;
  status: BattleStatus;
  paused: boolean;
  grid: Grid;
  phaseIndex: number;
  defense: number;
  sp: number;
  composure: number;
  turnsRemaining: number;
  turnsUsed: number;
  remainingMs: number | null;
  activeTimeMs: number;
  approach: Approach;
  response: Response | null;
  maxCombo: number;
  combo: number;
  streak: number;
  feedback: ClearFeedback | null;
  totalCleared: number;
  turnsEarned: number;
  multiplier: number;
  bonusTitle: string;
  message: string;
  story: BattleStory | null;
  lastDamage: number;
  vulnerabilityTurns: number;
  skillUsedThisTurn: boolean;
  enemyCooldown: number;
  hint: Position[] | null;
  result: BattleResult | null;
}
