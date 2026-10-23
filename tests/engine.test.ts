import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_GEM_TYPES, applyGravityAndRefill, chainMultiplier, createGem, createInitialGrid, findMatches, findPossibleSwap, getSwapEffect, hasPossibleMoves, matchRewards, resolveClear, seededRandom } from '../src/utils/match3Engine';
import type { Grid } from '../src/types/game';

const cleanGrid = (): Grid => Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, col) => createGem(ALL_GEM_TYPES[(row * 2 + col) % 5])));

test('initial boards have no free matches and always offer a legal swap', () => {
  for (let seed = 0; seed < 40; seed++) {
    const grid = createInitialGrid(seededRandom(seed));
    assert.equal(findMatches(grid).length, 0);
    assert.equal(hasPossibleMoves(grid), true);
  }
});

test('intersecting matches produce one bomb at the intersection', () => {
  const grid = cleanGrid();
  for (const [row, col] of [[2, 2], [2, 3], [2, 4], [3, 3], [4, 3]]) grid[row][col] = createGem('seduction');
  for (const [row, col] of [[2, 1], [2, 5], [1, 3], [5, 3]]) grid[row][col] = createGem('hypnosis');
  const group = findMatches(grid).find(item => item.type === 'seduction')!;
  assert.equal(group.matches.length, 5);
  assert.equal(group.specialToCreate?.special, 'bomb');
  assert.deepEqual(group.specialToCreate?.pos, { row: 2, col: 3 });
  const result = resolveClear(grid, [group]);
  assert.equal(result.grid.flat().filter(gem => gem?.special === 'bomb').length, 1);
});

test('five match creates an eye at the destination of the move', () => {
  const grid = cleanGrid();
  for (let col = 1; col <= 5; col++) grid[2][col] = createGem('hypnosis');
  const matches = findMatches(grid, { from: { row: 1, col: 1 }, to: { row: 2, col: 1 } });
  const eye = matches.find(item => item.type === 'hypnosis')!;
  assert.equal(eye.specialToCreate?.special, 'eye');
  assert.deepEqual(eye.specialToCreate?.pos, { row: 2, col: 1 });
});

test('eye swap clears the partner colour without requiring a three match', () => {
  const grid = cleanGrid();
  grid[3][3] = createGem('seduction', 'eye');
  grid[3][4] = createGem('desire');
  const original = structuredClone(grid);
  const effect = getSwapEffect(grid, { row: 3, col: 3 }, { row: 3, col: 4 })!;
  assert.ok(effect);
  const cleared = resolveClear(effect.grid, effect.matches, effect.forced);
  assert.ok(cleared.count >= original.flat().filter(gem => gem?.type === 'desire').length);
  assert.equal(cleared.grid.flat().some(gem => gem?.type === 'desire'), false);
  assert.deepEqual(grid, original);
});

test('special blasts trigger other specials once and unlock adjacent cells', () => {
  const grid = cleanGrid();
  grid[3][0] = createGem('hypnosis', 'line_h');
  grid[3][3] = createGem('seduction', 'bomb');
  grid[1][3] = { ...createGem('empathy'), locked: true };
  const original = structuredClone(grid);
  const result = resolveClear(grid, [], [{ row: 3, col: 0 }]);
  assert.equal(result.count, 13);
  assert.equal(result.specialCount, 2);
  assert.equal(result.grid[1][3]?.locked, false);
  assert.deepEqual(grid, original);
});

test('eye-eye combination clears all 49 cells; locks cannot be swapped or hinted', () => {
  const grid = cleanGrid();
  grid[3][3] = createGem('seduction', 'eye');
  grid[3][4] = createGem('desire', 'eye');
  const effect = getSwapEffect(grid, { row: 3, col: 3 }, { row: 3, col: 4 })!;
  assert.equal(resolveClear(effect.grid, [], effect.forced).count, 49);
  grid[3][3] = { ...grid[3][3]!, locked: true };
  assert.equal(getSwapEffect(grid, { row: 3, col: 3 }, { row: 3, col: 4 }), null);
  const hint = findPossibleSwap(grid);
  if (hint) for (const p of hint) assert.notEqual(grid[p.row][p.col]?.locked, true);
});

for (const length of [3, 4, 5, 6, 7]) test(`a straight ${length} match has the correct special and reward`, () => {
  const grid = cleanGrid();
  for (let col = 0; col < length; col++) grid[2][col] = createGem('seduction');
  if (length < 7) grid[2][length] = createGem('hypnosis');
  const matches = findMatches(grid);
  const match = matches.find(item => item.runLength === length)!;
  assert.ok(match); assert.equal(match.shape, 'line_h');
  assert.equal(match.specialToCreate?.special, length >= 5 ? 'eye' : length === 4 ? 'line_h' : undefined);
  const rewards = matchRewards([match]);
  assert.equal(rewards.damage, length >= 5 ? 5 + (length - 5) * 3 : length === 4 ? 2 : 0);
  assert.equal(rewards.sp, length >= 5 ? 5 + (length - 5) * 3 : length === 4 ? 3 : 0);
  assert.equal(rewards.grantsTurn, length >= 5);
  const clear = resolveClear(grid, [match]);
  assert.equal(clear.count, length);
  assert.equal(clear.grid.flat().filter(gem => gem?.special !== 'none' && gem !== null).length, length >= 4 ? 1 : 0);
});

test('vertical four creates a column special; separated groups both clear and earn multi-group rewards', () => {
  const grid = cleanGrid();
  for (let row = 1; row <= 4; row++) grid[row][2] = createGem('trauma');
  assert.equal(findMatches(grid).find(match => match.runLength === 4)?.specialToCreate?.special, 'line_v');
  const separate = cleanGrid();
  for (const row of [1, 5]) for (let col = 1; col <= 3; col++) separate[row][col] = createGem('empathy');
  for (const row of [1, 5]) for (const col of [0, 4]) separate[row][col] = createGem('hypnosis');
  const matches = findMatches(separate);
  assert.equal(matches.length, 2);
  assert.deepEqual(matchRewards(matches), { damage: 2, sp: 2, grantsTurn: false });
  assert.equal(resolveClear(separate, matches).count, 6);
});

test('an unrelated existing match cannot make an invalid swap legal', () => {
  const grid = cleanGrid();
  for (let col = 0; col < 3; col++) grid[0][col] = createGem('desire');
  assert.equal(getSwapEffect(grid, { row: 6, col: 5 }, { row: 6, col: 6 }), null);
});

for (const [left, right, kind, count] of [
  ['line_h', 'line_h', 'line-line', 13],
  ['line_v', 'line_h', 'line-line', 13],
  ['line_h', 'bomb', 'line-bomb', 33],
  ['bomb', 'bomb', 'bomb-bomb', 25],
  ['eye', 'eye', 'eye-eye', 49],
] as const) test(`${kind} expands its intended area once`, () => {
  const grid = cleanGrid();
  grid[3][2] = createGem('seduction', left); grid[3][3] = createGem('desire', right);
  const original = structuredClone(grid);
  const effect = getSwapEffect(grid, { row: 3, col: 2 }, { row: 3, col: 3 })!;
  assert.equal(effect.combination?.kind, kind);
  const clear = resolveClear(effect.grid, [], effect.forced, Math.random, effect.combination);
  assert.equal(clear.count, count); assert.equal(clear.specialCount, 2);
  assert.deepEqual(grid, original);
});

for (const [partner, kind] of [['none', 'eye-color'], ['line_h', 'eye-line'], ['bomb', 'eye-bomb']] as const) test(`${kind} reaches every partner-colour cell and chains other specials`, () => {
  const grid = cleanGrid(); grid[3][2] = createGem('hypnosis', 'eye'); grid[3][3] = createGem('desire', partner);
  const effect = getSwapEffect(grid, { row: 3, col: 2 }, { row: 3, col: 3 })!;
  const clear = resolveClear(effect.grid, [], effect.forced, Math.random, effect.combination);
  assert.equal(effect.combination?.kind, kind);
  assert.ok(clear.count > 7);
  for (const line of clear.grid) for (const gem of line) assert.notEqual(gem?.type, 'desire');
  assert.equal(clear.positions.length, new Set(clear.positions.map(pos => `${pos.row},${pos.col}`)).size);
});

test('a refill cascade includes all simultaneous matches and settles to a full stable board', () => {
  const random = seededRandom(18);
  let grid = cleanGrid();
  for (let col = 0; col < 7; col++) grid[6][col] = null;
  grid = applyGravityAndRefill(grid, random).newGrid;
  let rounds = 0;
  while (findMatches(grid).length) {
    grid = applyGravityAndRefill(resolveClear(grid, findMatches(grid), [], random).grid, random).newGrid;
    assert.ok(++rounds < 40);
  }
  assert.equal(grid.flat().filter(Boolean).length, 49);
  assert.equal(findMatches(grid).length, 0);
});

test('cascade multipliers grow by a quarter and cap at 2.5', () => {
  assert.deepEqual([1, 2, 3, 7, 12].map(chainMultiplier), [1, 1.25, 1.5, 2.5, 2.5]);
});
