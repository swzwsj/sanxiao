import type { ClearFeedback, Gem, Grid, MatchResult, PlayerSkill, Position, SpecialCombination } from '../types/game';
import type { Approach, BattleResult, BattleState, DemoConfig, FinishReason, Response } from '../types/demo';
import { encounterProgress } from './progress';
import { applyGravityAndRefill, chainMultiplier, COMBINATION_NAMES, createGem, createInitialGrid, findMatches, findPossibleSwap, getSwapEffect, hasPossibleMoves, inBounds, isAdjacent, matchRewards, positionKey, reshuffleGrid, resolveClear, seededRandom, swapGems } from '../utils/match3Engine';

type Options = { animationMs?: number; onSound?: (kind: 'swap' | 'match' | 'break' | 'invalid' | 'skill', combo: number) => void; onClear?: (feedback: ClearFeedback) => void };

/** Owns one encounter. Generation checks invalidate every old animation/dialogue on reset or finish. */
export class BattleController {
  private state: BattleState;
  private listeners = new Set<() => void>();
  private generation = 0;
  private aborter = new AbortController();
  private resumeDialogue: (() => void) | null = null;
  private random: () => number;
  private feedbackId = 0;
  private pendingVictory = false;
  private pendingComposureFailure = false;

  constructor(readonly config: DemoConfig, private options: Options = {}) {
    if (!config.phases.length || config.phases.some(p => p.defense <= 0) || !Number.isInteger(config.turns) || config.turns <= 0 || (config.timeLimitSeconds !== null && (!Number.isFinite(config.timeLimitSeconds) || config.timeLimitSeconds <= 0))) throw new Error('Invalid encounter configuration');
    if (!Object.values(config.breakProgress).every(Number.isFinite) || config.breakProgress.maximum <= 0 || config.breakProgress.successGain < 0 || !config.nextNode.id) throw new Error('Invalid story progress configuration');
    this.random = seededRandom(config.seed);
    this.state = this.initialState();
  }

  private initialState(): BattleState {
    const grid = createInitialGrid(this.random);
    grid[3][3] = { ...grid[3][3]!, special: 'eye' };
    return {
      runId: globalThis.crypto.randomUUID(), status: 'ready', paused: false, grid,
      phaseIndex: 0, defense: this.config.phases[0].defense, sp: 25, composure: 100,
      turnsRemaining: this.config.turns, turnsUsed: 0,
      remainingMs: this.config.timeLimitSeconds === null ? null : this.config.timeLimitSeconds * 1000,
      activeTimeMs: 0, approach: 'patient', response: null,
      maxCombo: 1, combo: 1, streak: 0, feedback: null, totalCleared: 0, turnsEarned: 0, multiplier: 1, bonusTitle: '三消打开话题，四消以上合成特殊宝石',
      message: '“陆医生，今天也要把我的话都拆开来听吗？”', lastDamage: 0,
      vulnerabilityTurns: 0, skillUsedThisTurn: false, enemyCooldown: 4, hint: null, result: null,
    };
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(update: Partial<BattleState>) { this.state = { ...this.state, ...update }; this.listeners.forEach(listener => listener()); }
  private live(token: number) { return token === this.generation && this.state.status !== 'finished'; }
  private cancel() {
    this.generation++;
    this.aborter.abort();
    this.aborter = new AbortController();
    this.resumeDialogue?.();
    this.resumeDialogue = null;
  }
  dispose() { this.cancel(); this.listeners.clear(); }
  reset() { this.cancel(); this.pendingVictory = false; this.pendingComposureFailure = false; this.random = seededRandom(this.config.seed); this.state = this.initialState(); this.listeners.forEach(listener => listener()); }
  start(approach: Approach) {
    if (this.state.status !== 'ready') return;
    this.patch({ status: 'playing', approach, defense: approach === 'direct' ? Math.max(1, Math.round(this.config.phases[0].defense * .8)) : this.config.phases[0].defense, sp: approach === 'patient' ? 50 : 25, message: approach === 'patient' ? '他没有接话，却也没有再起身离开。' : '他收起笑意，终于迎上你的目光。' });
  }
  setPaused(paused: boolean) { if (this.state.status !== 'finished') this.patch({ paused }); }
  advanceTime(ms: number) {
    if (this.state.status !== 'playing' || this.state.paused || !Number.isFinite(ms) || ms <= 0) return;
    const remainingMs = this.state.remainingMs === null ? null : Math.max(0, this.state.remainingMs - ms);
    this.patch({ activeTimeMs: this.state.activeTimeMs + ms, remainingMs });
    if (remainingMs === 0) this.finish('time_limit');
  }
  hint() { if (this.state.status === 'playing' && !this.state.paused) this.patch({ hint: findPossibleSwap(this.state.grid) }); }

  private async wait(token: number, factor = 1) {
    if (!this.live(token)) return false;
    const signal = this.aborter.signal;
    await new Promise<void>(resolve => {
      const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
      const timer = setTimeout(done, (this.options.animationMs ?? 180) * factor);
      signal.addEventListener('abort', done, { once: true });
    });
    return this.live(token);
  }

  private damage(raw: number) {
    const applied = Math.min(this.state.defense, Math.max(0, Math.round(raw)));
    const defense = Math.max(0, this.state.defense - applied);
    this.patch({ defense, lastDamage: applied });
    if (defense > 0) return 'hit' as const;
    if (this.state.phaseIndex === this.config.phases.length - 1) { this.pendingVictory = true; return 'won' as const; }
    const phaseIndex = this.state.phaseIndex + 1;
    this.patch({ phaseIndex, defense: this.config.phases[phaseIndex].defense, sp: Math.min(100, this.state.sp + 20), remainingMs: this.state.remainingMs === null ? null : Math.min((this.config.timeLimitSeconds! + 15) * 1000, this.state.remainingMs + 5000), message: this.config.phases[phaseIndex].quote });
    this.options.onSound?.('break', this.state.combo);
    return 'phase' as const;
  }

  private async phaseDialogue(token: number) {
    if (this.state.response || this.state.phaseIndex < 1 || !this.live(token)) return;
    this.addObstacles('lock', 3);
    this.patch({ status: 'dialogue', hint: null });
    await new Promise<void>(resolve => { this.resumeDialogue = resolve; });
  }

  chooseResponse(response: Response) {
    if (this.state.status !== 'dialogue' || this.state.response) return;
    this.patch({ response, status: 'resolving', message: response === 'press' ? '“……你还真是一点退路都不给。”' : '“如果我说了，你会认真听吗？”' });
    if (response === 'press') {
      this.patch({ composure: Math.max(0, this.state.composure - 8) });
      this.damage(6);
      if (this.state.composure === 0) this.pendingComposureFailure = true;
    } else this.patch({ composure: Math.min(100, this.state.composure + 20), sp: Math.min(100, this.state.sp + 15) });
    this.resumeDialogue?.();
    this.resumeDialogue = null;
  }

  private async cascades(token: number, initial: MatchResult[], forced: Position[] = [], boosted = false, combination: SpecialCombination | null = null, allowTurnReward = false) {
    let matches = initial, trigger = forced, combo = 1, turnRewarded = false;
    while (matches.length || trigger.length) {
      if (!this.live(token)) return;
      const clear = resolveClear(this.state.grid, matches, trigger, this.random, combination);
      if (!clear.count) break;
      const rewards = matchRewards(matches);
      const multiplier = chainMultiplier(combo) * (boosted ? 1.4 : 1);
      const rawDamage = Math.round((clear.count + clear.trauma + rewards.damage) * multiplier);
      const extraTurn = allowTurnReward && !turnRewarded && rewards.grantsTurn;
      if (extraTurn) turnRewarded = true;
      const longest = Math.max(0, ...matches.map(match => match.runLength));
      const kind = longest >= 6 ? 'long' : longest === 5 ? 'five' : matches.some(match => match.shape === 'cross') ? 'cross' : longest === 4 ? 'four' : clear.specialCount || trigger.length ? 'special' : 'three';
      const title = combination ? COMBINATION_NAMES[combination.kind] : kind === 'long' ? `${longest} 连消 · 超长共鸣` : kind === 'five' ? '五消 · 恶女之瞳' : kind === 'cross' ? '交叉消除 · 心灵炸弹' : kind === 'four' ? '四消 · 冲击针' : clear.specialCount ? '特殊宝石引爆' : trigger.length ? '技能共振消除' : matches.length > 1 ? `${matches.length} 组同时消除` : '三消 · 心防命中';
      const spGain = Math.min(100 - this.state.sp, clear.sp + rewards.sp);
      const feedback: ClearFeedback = {
        id: ++this.feedbackId, kind, title, detail: [matches.length > 1 ? `多组奖励 +${Math.max(0, matches.length - 1) * 2}` : '', extraTurn ? '步数 +1' : '', rewards.sp ? `奖励 SP +${rewards.sp}` : ''].filter(Boolean).join(' · '),
        chain: combo, count: clear.count, damage: Math.min(this.state.defense, rawDamage), multiplier, spGain, extraTurn, groups: matches.length,
        cells: clear.positions.map(pos => ({ pos, type: this.state.grid[pos.row][pos.col]!.type })),
        created: matches.flatMap(match => match.specialToCreate ? [match.specialToCreate] : []), activated: clear.activated, combination,
      };
      this.patch({ combo, maxCombo: Math.max(this.state.maxCombo, combo), multiplier, bonusTitle: title, feedback, totalCleared: this.state.totalCleared + clear.count, sp: this.state.sp + spGain, composure: this.pendingComposureFailure ? 0 : Math.min(100, this.state.composure + clear.heal), turnsRemaining: this.state.turnsRemaining + (extraTurn ? 1 : 0), turnsEarned: this.state.turnsEarned + (extraTurn ? 1 : 0) });
      this.options.onSound?.('match', combo);
      this.options.onClear?.(feedback);
      const hit = this.damage(rawDamage);
      const keys = new Set(clear.positions.map(positionKey));
      this.patch({ grid: this.state.grid.map((row, r) => row.map((gem, c) => gem && { ...gem, isMatching: keys.has(`${r},${c}`) })) });
      if (!await this.wait(token)) return;
      this.patch({ grid: clear.grid });
      if (!await this.wait(token, .6)) return;
      this.patch({ grid: applyGravityAndRefill(this.state.grid, this.random).newGrid });
      if (!await this.wait(token, 1.3)) return;
      if (hit === 'phase') {
        await this.phaseDialogue(token);
        if (!this.live(token)) return;
      }
      matches = findMatches(this.state.grid);
      trigger = [];
      combination = null;
      combo++;
      if (combo > 40) { this.patch({ grid: reshuffleGrid(this.state.grid, this.random), message: '思绪已重新整理，继续寻找下一次突破。' }); break; }
    }
  }

  async swap(from: Position, to: Position) {
    if (this.state.status !== 'playing' || this.state.paused || !inBounds(from) || !inBounds(to) || !isAdjacent(from, to)) return;
    if (this.state.grid[from.row][from.col]?.locked || this.state.grid[to.row][to.col]?.locked) return;
    const token = this.generation;
    const original = this.state.grid;
    const effect = getSwapEffect(original, from, to);
    this.patch({ status: 'resolving', grid: effect?.grid ?? swapGems(original, from, to), hint: null, feedback: null, combo: 1 });
    this.options.onSound?.('swap', 1);
    if (!await this.wait(token)) return;
    if (!effect) {
      this.options.onSound?.('invalid', 1);
      this.patch({ grid: original, streak: 0, composure: Math.max(0, this.state.composure - 4), message: '这次试探没有奏效。从容度 -4，连续命中重置，步数不变。' });
      if (this.state.composure === 0) this.finish('composure');
      else this.patch({ status: 'playing' });
      return;
    }
    const boosted = this.state.vulnerabilityTurns > 0;
    const streak = this.state.streak + 1;
    this.patch({ turnsRemaining: this.state.turnsRemaining - 1, turnsUsed: this.state.turnsUsed + 1, skillUsedThisTurn: false, streak, sp: Math.min(100, this.state.sp + (streak >= 3 ? 3 : 0)) });
    await this.cascades(token, effect.matches, effect.forced, boosted, effect.combination, true);
    if (!this.live(token)) return;
    if (boosted) this.patch({ vulnerabilityTurns: Math.max(0, this.state.vulnerabilityTurns - 1) });
    if (this.pendingComposureFailure) { this.finish('composure'); return; }
    if (this.pendingVictory) { this.finish('defense_broken'); return; }
    if (this.state.turnsRemaining === 0) { this.finish('turn_limit'); return; }
    await this.hazards(token);
    if (!this.live(token)) return;
    if (this.state.enemyCooldown <= 1) { this.addObstacles(this.state.turnsUsed % 8 === 0 ? 'fire' : 'lock', 2); this.patch({ enemyCooldown: 4 }); }
    else this.patch({ enemyCooldown: this.state.enemyCooldown - 1 });
    await this.endAction(token);
  }

  private addObstacles(kind: 'lock' | 'fire', count: number) {
    const grid = this.state.grid.map(row => row.map(gem => gem && { ...gem }));
    const candidates: Position[] = [];
    grid.forEach((row, r) => row.forEach((gem, c) => { if (gem && !gem.locked && gem.special === 'none' && gem.fireCountdown === undefined) candidates.push({ row: r, col: c }); }));
    for (let i = 0; i < count && candidates.length; i++) {
      const p = candidates.splice(Math.floor(this.random() * candidates.length), 1)[0];
      grid[p.row][p.col] = { ...grid[p.row][p.col]!, ...(kind === 'lock' ? { locked: true } : { fireCountdown: 3 }) };
    }
    this.patch({ grid, ...(this.state.status !== 'dialogue' ? { message: kind === 'lock' ? '他再次回避了问题。相邻消除可解除心结锁链，技能可解除全部锁链。' : '情绪开始升温。请在 3 次有效交换内消除心火，否则从容度 -18。' } : {}) });
  }

  private async hazards(token: number) {
    const grid = this.state.grid.map(row => row.map(gem => gem && { ...gem }));
    const explosions: Position[] = [];
    grid.forEach((row, r) => row.forEach((gem, c) => {
      if (gem?.fireCountdown !== undefined) {
        if (gem.fireCountdown <= 1) explosions.push({ row: r, col: c });
        else grid[r][c] = { ...gem, fireCountdown: gem.fireCountdown - 1 };
      }
    }));
    for (const p of explosions) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const q = { row: p.row + dr, col: p.col + dc };
      if (inBounds(q)) grid[q.row][q.col] = null;
    }
    this.patch({ grid: explosions.length ? applyGravityAndRefill(grid, this.random).newGrid : grid });
    if (explosions.length) {
      this.patch({ composure: Math.max(0, this.state.composure - explosions.length * 18), message: `心火反噬，从容度 -${explosions.length * 18}。` });
      if (this.state.composure === 0) this.pendingComposureFailure = true;
      await this.cascades(token, findMatches(this.state.grid));
    }
  }

  async cast(skill: PlayerSkill) {
    const costs: Record<string, number> = { seduction_transference: 30, trauma_regression: 45, hypnosis_stasis: 65, femme_fatale_kiss: 90 };
    const cost = costs[skill.id];
    if (this.state.status !== 'playing' || this.state.paused || this.state.turnsUsed === 0 || this.state.skillUsedThisTurn || cost === undefined || this.state.sp < cost) return;
    const token = this.generation;
    this.patch({ status: 'resolving', sp: this.state.sp - cost, skillUsedThisTurn: true, hint: null, feedback: null, combo: 1, grid: this.state.grid.map(row => row.map(gem => gem && { ...gem, locked: false })) });
    this.options.onSound?.('skill', 1);
    let forced: Position[] = [];
    if (skill.id === 'seduction_transference') {
      const grid = this.state.grid.map(row => [...row]);
      const candidates = grid.flatMap((row, r) => row.flatMap((gem, c) => gem && gem.type !== 'seduction' && gem.special === 'none' ? [{ row: r, col: c }] : []));
      for (let i = 0; i < 4 && candidates.length; i++) { const p = candidates.splice(Math.floor(this.random() * candidates.length), 1)[0]; grid[p.row][p.col] = { ...grid[p.row][p.col]!, type: 'seduction' }; }
      this.patch({ grid, message: '移情操纵：4 颗普通宝石转化为诱惑宝石，额外造成 4 点心防伤害。' });
      const hit = this.damage(4);
      if (hit === 'phase') await this.phaseDialogue(token);
    } else if (skill.id === 'trauma_regression') {
      forced = Array.from({ length: 9 }, (_, i) => ({ row: 2 + Math.floor(i / 3), col: 2 + i % 3 }));
      this.patch({ vulnerabilityTurns: 3, message: '创伤回溯：中央爆破，接下来 3 次有效交换伤害 +40%。' });
    } else if (skill.id === 'hypnosis_stasis') {
      const candidates = this.state.grid.flatMap((row, r) => row.flatMap((gem, c) => gem ? [{ row: r, col: c }] : []));
      for (let i = 0; i < 12 && candidates.length; i++) forced.push(candidates.splice(Math.floor(this.random() * candidates.length), 1)[0]);
      this.patch({ enemyCooldown: this.state.enemyCooldown + 2, composure: Math.min(100, this.state.composure + 15), message: '极乐催眠：共振消除 12 颗宝石，反制延后 2 回合。' });
    } else {
      const lost = this.config.phases.slice(0, this.state.phaseIndex).reduce((sum, p) => sum + p.defense, 0) + this.config.phases[this.state.phaseIndex].defense - this.state.defense;
      const damage = Math.max(10, Math.round(lost * .35));
      this.patch({ message: `恶女之吻：造成 ${damage} 点心防伤害。` });
      const hit = this.damage(damage);
      if (hit === 'phase') await this.phaseDialogue(token);
    }
    if (!this.live(token)) return;
    await this.cascades(token, findMatches(this.state.grid), forced);
    if (this.live(token)) await this.endAction(token);
  }

  private async endAction(token: number) {
    // Every action, including a skill or hazard, must leave a stable board before input or results.
    const remaining = findMatches(this.state.grid);
    if (remaining.length) await this.cascades(token, remaining);
    if (!this.live(token)) return;
    if (this.pendingComposureFailure) { this.finish('composure'); return; }
    if (this.pendingVictory) { this.finish('defense_broken'); return; }
    if (!hasPossibleMoves(this.state.grid)) this.patch({ grid: reshuffleGrid(this.state.grid, this.random), message: '棋盘已重新整理，步数保持不变。' });
    this.patch({ status: 'playing' });
  }

  private finish(reason: FinishReason) {
    if (this.state.result) return;
    const s = this.state;
    const outcome = reason === 'defense_broken' ? 'success' : s.phaseIndex > 0 ? 'partial' : 'failure';
    const score = Math.round((s.turnsRemaining / this.config.turns) * 35 + s.composure * .3 + Math.min(5, s.maxCombo) * 7);
    const grade = outcome === 'success' ? score >= 80 ? 'S' : score >= 65 ? 'A' : score >= 45 ? 'B' : 'C' : outcome === 'partial' ? 'B' : 'C';
    const continuationId = outcome === 'success' ? s.response === 'press' ? 'consultation.continue.tense' : 'consultation.continue.open' : outcome === 'partial' ? 'consultation.continue.guarded' : 'consultation.interrupted';
    const result: BattleResult = { version: 1, runId: s.runId, battleId: this.config.id, sceneId: this.config.sceneId, outcome, reason, grade, approach: s.approach, response: s.response, phasesCleared: outcome === 'success' ? this.config.phases.length : s.phaseIndex, turnsUsed: s.turnsUsed, turnsRemaining: s.turnsRemaining, maxCombo: s.maxCombo, composure: s.composure, activeTimeMs: Math.round(s.activeTimeMs), storyFlags: [`approach:${s.approach}`, ...(s.response ? [`response:${s.response}`] : []), `consultation:${outcome}`], continuationId, ...encounterProgress(this.config, outcome === 'success'), nextNodeId: this.config.nextNode.id };
    this.patch({ status: 'finished', paused: false, hint: null, result });
    this.cancel();
  }
}
