import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BattleController } from '../src/game/BattleController';
import { DEMO_CONFIG } from '../src/data/demo';
import { PLAYER_SKILLS } from '../src/data/characters';
import { findPossibleSwap, getSwapEffect, resolveClear } from '../src/utils/match3Engine';
import type { Position } from '../src/types/game';

const make = (extra = {}) => new BattleController({ ...DEMO_CONFIG, ...extra }, { animationMs: 0 });
function autoDialogue(controller: BattleController) {
  return controller.subscribe(() => { if (controller.getSnapshot().status === 'dialogue') queueMicrotask(() => controller.chooseResponse('reassure')); });
}
function bestMove(controller: BattleController): Position[] {
  const grid = controller.getSnapshot().grid;
  let best: Position[] = [], score = -1;
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) for (const to of [{ row, col: col + 1 }, { row: row + 1, col }]) {
    const from = { row, col }, effect = getSwapEffect(grid, from, to);
    if (!effect) continue;
    const clear = resolveClear(effect.grid, effect.matches, effect.forced);
    const value = clear.count + clear.trauma + effect.matches.filter(match => match.specialToCreate).length * 2;
    if (value > score) { score = value; best = [from, to]; }
  }
  return best;
}

test('ready, pause and animations do not spend time; active input does', async () => {
  const c = make({ timeLimitSeconds: 60, phases: [{ name: 'test', defense: 10000, quote: '' }] });
  c.advanceTime(5000); assert.equal(c.getSnapshot().remainingMs, 60000);
  c.start('patient'); c.advanceTime(2000); assert.equal(c.getSnapshot().remainingMs, 58000);
  c.setPaused(true); c.advanceTime(5000); assert.equal(c.getSnapshot().remainingMs, 58000);
  c.setPaused(false);
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  const action = c.swap(from, to);
  c.advanceTime(90000); assert.equal(c.getSnapshot().remainingMs, 58000);
  await action;
  c.advanceTime(1000); assert.equal(c.getSnapshot().remainingMs, 57000);
});

test('the last allowed move can win and the result is immutable after finish', async () => {
  const c = make({ turns: 1, phases: [{ name: 'test', defense: 1, quote: '' }] });
  c.start('direct');
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  await c.swap(from, to);
  const result = c.getSnapshot().result!;
  assert.equal(result.outcome, 'success'); assert.equal(result.turnsRemaining, 0);
  assert.equal(result.progressBefore, 0); assert.equal(result.progressDelta, 20); assert.equal(result.breakProgress, 20);
  assert.equal(result.nextNodeId, DEMO_CONFIG.nextNode.id);
  c.advanceTime(100000); await c.cast(PLAYER_SKILLS[0]); await c.swap(from, to);
  assert.equal(c.getSnapshot().result, result);
});

test('reset during an animation cancels all writes from the old encounter', async () => {
  const c = new BattleController(DEMO_CONFIG, { animationMs: 80 });
  c.start('patient');
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  const action = c.swap(from, to);
  c.reset(); c.start('direct');
  const expected = structuredClone(c.getSnapshot());
  await action;
  assert.deepEqual(c.getSnapshot(), expected);
});

test('a completed phase and an exhausted turn budget return a local partial outcome', async () => {
  const c = make({ turns: 1, phases: [{ name: 'one', defense: 1, quote: '' }, { name: 'two', defense: 10000, quote: '' }] });
  const unsubscribe = autoDialogue(c); c.start('patient');
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  await c.swap(from, to);
  const result = c.getSnapshot().result!;
  assert.equal(result.outcome, 'partial'); assert.equal(result.reason, 'turn_limit');
  assert.equal(result.phasesCleared, 1); assert.equal(result.response, 'reassure');
  assert.equal(result.progressDelta, 0); assert.equal(result.breakProgress, 0);
  assert.deepEqual(result.storyFlags, ['approach:patient', 'response:reassure', 'consultation:partial']);
  unsubscribe();
});

test('a timed encounter finishes once; later input cannot revive it', async () => {
  const c = make({ timeLimitSeconds: 1 }); c.start('patient');
  c.advanceTime(1000);
  const state = c.getSnapshot();
  assert.equal(state.result?.reason, 'time_limit'); assert.equal(state.result?.outcome, 'failure');
  assert.equal(state.result?.progressDelta, 0); assert.equal(state.result?.breakProgress, 0);
  await c.swap({ row: 3, col: 3 }, { row: 3, col: 4 }); c.chooseResponse('press');
  assert.deepEqual(c.getSnapshot(), state);
});

test('invalid swaps do not spend a turn; zero composure has a distinct failure reason', async () => {
  const c = make(); c.start('patient');
  let invalid: Position[] = [];
  const grid = c.getSnapshot().grid;
  for (let row = 0; row < 7 && !invalid.length; row++) for (let col = 0; col < 6; col++) if (!getSwapEffect(grid, { row, col }, { row, col: col + 1 })) { invalid = [{ row, col }, { row, col: col + 1 }]; break; }
  assert.equal(invalid.length, 2);
  for (let i = 0; i < 25; i++) await c.swap(invalid[0], invalid[1]);
  assert.equal(c.getSnapshot().turnsRemaining, DEMO_CONFIG.turns);
  assert.equal(c.getSnapshot().result?.reason, 'composure');
});

test('trauma skill supplies the promised buff and skills never spend turns', async () => {
  const c = make({ phases: [{ name: 'test', defense: 10000, quote: '' }] }); c.start('patient');
  const first = findPossibleSwap(c.getSnapshot().grid)!;
  await c.swap(first[0], first[1]);
  await c.cast(PLAYER_SKILLS[1]);
  assert.equal(c.getSnapshot().vulnerabilityTurns, 3); assert.equal(c.getSnapshot().turnsUsed, 1);
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  await c.swap(from, to);
  assert.equal(c.getSnapshot().vulnerabilityTurns, 2); assert.equal(c.getSnapshot().turnsUsed, 2);
});

test('demo can be completed with public actions, a choice and finite resources', async () => {
  const c = make(); autoDialogue(c); c.start('patient');
  for (let action = 0; action < 30 && c.getSnapshot().status !== 'finished'; action++) {
    if (c.getSnapshot().turnsUsed > 0 && !c.getSnapshot().skillUsedThisTurn && c.getSnapshot().sp >= 90) await c.cast(PLAYER_SKILLS[3]);
    else if (c.getSnapshot().turnsUsed > 0 && !c.getSnapshot().skillUsedThisTurn && c.getSnapshot().sp >= 45) await c.cast(PLAYER_SKILLS[1]);
    else { const [from, to] = bestMove(c); assert.ok(from && to); await c.swap(from, to); }
  }
  const result = c.getSnapshot().result!;
  assert.equal(result?.outcome, 'success'); assert.equal(result.response, 'reassure');
  assert.ok(result.turnsUsed > 0 && result.turnsUsed <= DEMO_CONFIG.turns);
  assert.equal(result.phasesCleared, 3);
});

test('only one skill is available after each valid swap', async () => {
  const c = make({ phases: [{ name: 'test', defense: 10000, quote: '' }] }); c.start('patient');
  const ready = c.getSnapshot(); await c.cast(PLAYER_SKILLS[0]); assert.equal(c.getSnapshot(), ready);
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!; await c.swap(from, to);
  await c.cast(PLAYER_SKILLS[0]);
  const used = c.getSnapshot(); await c.cast(PLAYER_SKILLS[0]); assert.equal(c.getSnapshot(), used);
});

test('mid-battle dialogue freezes a timed encounter and reset cancels its pending continuation', async () => {
  const c = make({ timeLimitSeconds: 30, phases: [{ name: 'one', defense: 1, quote: '' }, { name: 'two', defense: 10000, quote: '' }] });
  c.start('patient');
  const dialogue = new Promise<void>(resolve => { const off = c.subscribe(() => { if (c.getSnapshot().status === 'dialogue') { off(); resolve(); } }); });
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  const action = c.swap(from, to); await dialogue;
  const time = c.getSnapshot().remainingMs; c.advanceTime(60000); assert.equal(c.getSnapshot().remainingMs, time);
  c.reset(); c.start('direct'); const expected = structuredClone(c.getSnapshot());
  await action; assert.deepEqual(c.getSnapshot(), expected);
});

test('retry produces a new attempt without accumulating the same scene reward twice', async () => {
  const c = make({ phases: [{ name: 'test', defense: 1, quote: '' }] });
  const results = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    c.start('patient');
    const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
    await c.swap(from, to);
    results.push(c.getSnapshot().result!);
    c.reset();
  }
  assert.notEqual(results[0].runId, results[1].runId);
  assert.deepEqual(results.map(result => result.breakProgress), [20, 20]);
});

test('story progress starts from the film value and caps at its configured maximum', async () => {
  const c = make({ breakProgress: { initial: 85, successGain: 20, maximum: 100 }, nextNode: { id: 'film-scene-02', title: 'Next' }, phases: [{ name: 'test', defense: 1, quote: '' }] });
  c.start('patient');
  const [from, to] = findPossibleSwap(c.getSnapshot().grid)!;
  await c.swap(from, to);
  const result = c.getSnapshot().result!;
  assert.equal(result.progressBefore, 85); assert.equal(result.progressDelta, 15); assert.equal(result.breakProgress, 100);
  assert.equal(result.nextNodeId, 'film-scene-02');
});
