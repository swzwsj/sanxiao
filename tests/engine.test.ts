import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_GEM_TYPES, createGem, createInitialGrid, findMatches, findPossibleSwap, getSwapEffect, hasPossibleMoves, resolveClear, seededRandom } from '../src/utils/match3Engine';
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
