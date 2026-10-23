import type { CombinationKind, DefensePhase, Gem, GemType, Grid, MatchResult, Position, SpecialCombination, SpecialType } from '../types/game';
export const GRID_ROWS = 7;
export const GRID_COLS = 7;
export const ALL_GEM_TYPES: GemType[] = ['seduction', 'hypnosis', 'empathy', 'desire', 'trauma'];
let gemCounter = 0;
export const positionKey = (p: Position) => `${p.row},${p.col}`;
export const inBounds = (p: Position) => Number.isInteger(p.row) && Number.isInteger(p.col) && p.row >= 0 && p.row < 7 && p.col >= 0 && p.col < 7;
export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => { value += 0x6d2b79f5; let t = Math.imul(value ^ (value >>> 15), 1 | value); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function createGem(type?: GemType, special: SpecialType = 'none', random = Math.random): Gem {
  return { id: `gem_${++gemCounter}`, type: type ?? ALL_GEM_TYPES[Math.floor(random() * 5)], special, isNew: true };
}
export function createInitialGrid(random = Math.random): Grid {
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid: Grid = [];
    for (let row = 0; row < 7; row++) {
      grid[row] = [];
      for (let col = 0; col < 7; col++) {
        const invalid = new Set<GemType>();
        if (col >= 2 && grid[row][col - 1]?.type === grid[row][col - 2]?.type) invalid.add(grid[row][col - 1]!.type);
        if (row >= 2 && grid[row - 1][col]?.type === grid[row - 2][col]?.type) invalid.add(grid[row - 1][col]!.type);
        const types = ALL_GEM_TYPES.filter(type => !invalid.has(type));
        grid[row][col] = createGem(types[Math.floor(random() * types.length)], 'none', random);
      }
    }
    if (hasPossibleMoves(grid)) return grid;
  }
  const grid: Grid = Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, col) => createGem(ALL_GEM_TYPES[(row + col) % 5])));
  grid[3][3] = createGem('seduction', 'eye');
  return grid;
}
export function isAdjacent(a: Position, b: Position) { return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1; }
export function swapGems(grid: Grid, a: Position, b: Position): Grid {
  const next = grid.map(row => [...row]);
  [next[a.row][a.col], next[b.row][b.col]] = [next[b.row][b.col], next[a.row][a.col]];
  return next;
}
export function findMatches(grid: Grid, swapAction?: { from: Position; to: Position }): MatchResult[] {
  type Run = { positions: Position[]; type: GemType; axis: 'h' | 'v' };
  const runs: Run[] = [];
  for (const axis of ['h', 'v'] as const) for (let line = 0; line < 7; line++) {
    let start = 0;
    while (start < 7) {
      const get = (i: number) => axis === 'h' ? grid[line][i] : grid[i][line];
      const gem = get(start);
      let end = start + 1;
      while (gem && end < 7 && get(end)?.type === gem.type) end++;
      if (gem && end - start >= 3) runs.push({ type: gem.type, axis, positions: Array.from({ length: end - start }, (_, i) => axis === 'h' ? { row: line, col: start + i } : { row: start + i, col: line }) });
      start = end;
    }
  }
  const groups: Run[][] = [];
  for (const run of runs) {
    const overlaps = groups.filter(group => group.some(other => other.type === run.type && other.positions.some(a => run.positions.some(b => positionKey(a) === positionKey(b)))));
    if (!overlaps.length) groups.push([run]);
    else { const merged = [run, ...overlaps.flat()]; overlaps.forEach(group => groups.splice(groups.indexOf(group), 1)); groups.push(merged); }
  }
  return groups.map(group => {
    const positions = [...new Map(group.flatMap(run => run.positions).map(p => [positionKey(p), p])).values()];
    const longest = Math.max(...group.map(run => run.positions.length));
    const cross = new Set(group.map(run => run.axis)).size > 1;
    const special: SpecialType = longest >= 5 ? 'eye' : cross ? 'bomb' : longest === 4 ? (group[0].axis === 'h' ? 'line_h' : 'line_v') : 'none';
    const intersection = positions.find(p => group.filter(run => run.positions.some(q => positionKey(q) === positionKey(p))).length > 1);
    const preferred = swapAction && [swapAction.to, swapAction.from].find(p => positions.some(q => positionKey(p) === positionKey(q)));
    const pos = preferred || intersection || positions[Math.floor(positions.length / 2)];
    return { matches: positions, type: group[0].type, runLength: longest, shape: cross ? 'cross' : group[0].axis === 'h' ? 'line_h' : 'line_v', specialToCreate: special === 'none' ? undefined : { pos, special } };
  });
}
/** One validator for player swaps, hints, special activation, and deadlock detection. */
export function getSwapEffect(grid: Grid, from: Position, to: Position) {
  if (!inBounds(from) || !inBounds(to) || !isAdjacent(from, to)) return null;
  const a = grid[from.row][from.col], b = grid[to.row][to.col];
  if (!a || !b || a.locked || b.locked) return null;
  const swapped = swapGems(grid, from, to);
  const forced: Position[] = [];
  let combination: SpecialCombination | null = null;
  const row = (r: number) => { for (let col = 0; col < 7; col++) forced.push({ row: r, col }); };
  const column = (c: number) => { for (let r = 0; r < 7; r++) forced.push({ row: r, col: c }); };
  const area = (center: Position, radius: number) => { for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) forced.push({ row: center.row + dr, col: center.col + dc }); };
  if (a.special === 'eye' || b.special === 'eye') {
    const all = a.special === 'eye' && b.special === 'eye';
    const partner = a.special === 'eye' ? b : a;
    const kind: CombinationKind = all ? 'eye-eye' : partner.special === 'bomb' ? 'eye-bomb' : partner.special.startsWith('line_') ? 'eye-line' : 'eye-color';
    combination = { kind, consumed: [from, to], origin: to };
    swapped.forEach((line, r) => line.forEach((gem, c) => {
      if (!gem || (!all && gem.type !== partner.type)) return;
      forced.push({ row: r, col: c });
      if (kind === 'eye-bomb') area({ row: r, col: c }, 1);
      if (kind === 'eye-line') { if (partner.special === 'line_h') row(r); else column(c); }
    }));
    forced.push(from, to);
  } else if (a.special !== 'none' && b.special !== 'none') {
    const kind = a.special === 'bomb' && b.special === 'bomb' ? 'bomb-bomb' : a.special === 'bomb' || b.special === 'bomb' ? 'line-bomb' : 'line-line';
    combination = { kind, consumed: [from, to], origin: to };
    forced.push(from, to);
    if (kind === 'bomb-bomb') area(to, 2);
    else if (kind === 'line-line') { row(to.row); column(to.col); }
    else for (let offset = -1; offset <= 1; offset++) { row(to.row + offset); column(to.col + offset); }
  }
  const matches = findMatches(swapped, { from, to });
  const affectsSwap = matches.some(match => match.matches.some(p => positionKey(p) === positionKey(from) || positionKey(p) === positionKey(to)));
  return affectsSwap || forced.length ? { grid: swapped, matches, forced, combination } : null;
}
export function findPossibleSwap(grid: Grid): Position[] | null {
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
    const from = { row, col };
    for (const to of [{ row, col: col + 1 }, { row: row + 1, col }]) if (getSwapEffect(grid, from, to)) return [from, to];
  }
  return null;
}
export const hasPossibleMoves = (grid: Grid) => Boolean(findPossibleSwap(grid));
export function resolveClear(grid: Grid, matches: MatchResult[], forced: Position[] = [], random = Math.random, combination: SpecialCombination | null = null) {
  const positions = new Map<string, Position>();
  const queue: Position[] = [];
  const add = (p: Position) => { if (inBounds(p) && grid[p.row][p.col] && !positions.has(positionKey(p))) { positions.set(positionKey(p), p); queue.push(p); } };
  matches.forEach(match => match.matches.forEach(add)); forced.forEach(add);
  const consumed = new Set(combination?.consumed.map(positionKey));
  const activated: { pos: Position; special: SpecialType }[] = [];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], gem = grid[p.row][p.col]!;
    if (gem.special === 'none') continue;
    activated.push({ pos: p, special: gem.special });
    if (consumed.has(positionKey(p))) continue;
    if (gem.special === 'line_h') for (let col = 0; col < 7; col++) add({ row: p.row, col });
    if (gem.special === 'line_v') for (let row = 0; row < 7; row++) add({ row, col: p.col });
    if (gem.special === 'bomb') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add({ row: p.row + dr, col: p.col + dc });
    if (gem.special === 'eye') grid.forEach((row, r) => row.forEach((other, c) => { if (other?.type === gem.type) add({ row: r, col: c }); }));
  }
  let sp = 0, heal = 0, trauma = 0;
  const next: Grid = grid.map(row => row.map(gem => gem && { ...gem, isMatching: false }));
  positions.forEach(p => {
    const gem = grid[p.row][p.col]!;
    sp += gem.type === 'desire' ? 2 : ['seduction', 'trauma'].includes(gem.type) ? 1 : 0;
    heal += gem.type === 'empathy' ? 2 : gem.type === 'hypnosis' ? 1 : 0;
    trauma += gem.type === 'trauma' ? 1 : 0;
    next[p.row][p.col] = null;
    for (const q of [{ row: p.row - 1, col: p.col }, { row: p.row + 1, col: p.col }, { row: p.row, col: p.col - 1 }, { row: p.row, col: p.col + 1 }]) if (inBounds(q) && next[q.row][q.col]?.locked) next[q.row][q.col] = { ...next[q.row][q.col]!, locked: false };
  });
  for (const match of matches) if (match.specialToCreate) {
    const { pos, special } = match.specialToCreate;
    next[pos.row][pos.col] = createGem(match.type, special, random);
  }
  return { grid: next, positions: [...positions.values()], count: positions.size, sp, heal, trauma, specialCount: activated.length, activated };
}

export const COMBINATION_NAMES: Record<CombinationKind, string> = {
  'line-line': '十字贯穿', 'line-bomb': '三线轰击', 'bomb-bomb': '双重爆破',
  'eye-color': '同色共鸣', 'eye-line': '共鸣扫射', 'eye-bomb': '共鸣爆破', 'eye-eye': '全盘共鸣',
};
/** Shared by the controller and the rules UI; one reward per natural match group. */
export function matchRewards(matches: MatchResult[]) {
  let damage = 0, sp = 0, grantsTurn = false;
  for (const match of matches) {
    if (match.runLength >= 5) { const bonus = 5 + (match.runLength - 5) * 3; damage += bonus; sp += bonus; grantsTurn = true; }
    else if (match.shape === 'cross') { damage += 3; sp += 4; }
    else if (match.runLength === 4) { damage += 2; sp += 3; }
  }
  const simultaneousBonus = Math.max(0, matches.length - 1) * 2;
  return { damage: damage + simultaneousBonus, sp: sp + simultaneousBonus, grantsTurn };
}
export const chainMultiplier = (chain: number) => 1 + Math.min(6, Math.max(0, chain - 1)) * .25;
export function applyGravityAndRefill(grid: Grid, random = Math.random): { newGrid: Grid; fallenGemsCount: number } {
  const next: Grid = Array.from({ length: 7 }, () => Array(7).fill(null));
  let fallenGemsCount = 0;
  for (let col = 0; col < 7; col++) {
    let write = 6;
    for (let row = 6; row >= 0; row--) if (grid[row][col]) {
      if (row !== write) fallenGemsCount++;
      next[write--][col] = { ...grid[row][col]!, isNew: false, isMatching: false };
    }
    while (write >= 0) { next[write--][col] = createGem(undefined, 'none', random); fallenGemsCount++; }
  }
  return { newGrid: next, fallenGemsCount };
}
export function reshuffleGrid(grid: Grid, random = Math.random): Grid {
  const gems = grid.flat().filter((gem): gem is Gem => Boolean(gem)).map(gem => ({ ...gem, isMatching: false }));
  if (gems.length === 49) for (let attempt = 0; attempt < 60; attempt++) {
    for (let i = gems.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [gems[i], gems[j]] = [gems[j], gems[i]]; }
    const next = Array.from({ length: 7 }, (_, row) => gems.slice(row * 7, row * 7 + 7));
    if (!findMatches(next).length && hasPossibleMoves(next)) return next;
  }
  return createInitialGrid(random);
}
export function getDefensePhase(current: number, max: number): DefensePhase {
  const ratio = current / max;
  return ratio > .75 ? 'guarded' : ratio > .5 ? 'wavering' : ratio > .25 ? 'breakdown' : 'submissive';
}
// Original component compatibility; demo damage uses actual gem counts and chain rounds.
export function calculateMatchDamage(combo: number, special = false) {
  const baseDamage = Math.max(1, combo);
  const multiplier = combo >= 4 ? 3 : combo >= 2 ? (special ? 3 : 2) : special ? 2 : 1;
  return { damage: baseDamage * multiplier, baseDamage, multiplier, bonusTitle: `${combo} 轮连锁` };
}
export function calculateComboMultiplier(_phase: DefensePhase, combo: number) { return { ...calculateMatchDamage(combo), isCritical: combo >= 2 }; }
