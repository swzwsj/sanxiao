import { DefensePhase, Gem, GemType, Grid, MatchResult, Position, SpecialType } from '../types/game';

export const GRID_ROWS = 7;
export const GRID_COLS = 7;

export const ALL_GEM_TYPES: GemType[] = ['seduction', 'hypnosis', 'empathy', 'desire', 'trauma'];

let gemCounter = 0;
export function createGem(type?: GemType, special: SpecialType = 'none'): Gem {
  const finalType = type || ALL_GEM_TYPES[Math.floor(Math.random() * ALL_GEM_TYPES.length)];
  return {
    id: `gem_${Date.now()}_${++gemCounter}`,
    type: finalType,
    special,
    isNew: true,
  };
}

export function createInitialGrid(): Grid {
  let grid: Grid = [];
  let attempts = 0;

  do {
    grid = [];
    gemCounter = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: (Gem | null)[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        // Pick gem type that does not cause 3-in-a-row immediately
        const invalidTypes = new Set<GemType>();
        if (c >= 2 && row[c - 1]?.type && row[c - 1]?.type === row[c - 2]?.type) {
          invalidTypes.add(row[c - 1]!.type);
        }
        if (r >= 2 && grid[r - 1][c]?.type && grid[r - 1][c]?.type === grid[r - 2][c]?.type) {
          invalidTypes.add(grid[r - 1][c]!.type);
        }

        const validTypes = ALL_GEM_TYPES.filter(t => !invalidTypes.has(t));
        const chosenType = validTypes.length > 0
          ? validTypes[Math.floor(Math.random() * validTypes.length)]
          : ALL_GEM_TYPES[Math.floor(Math.random() * ALL_GEM_TYPES.length)];

        row.push(createGem(chosenType));
      }
      grid.push(row);
    }
    attempts++;
  } while (!hasPossibleMoves(grid) && attempts < 20);

  return grid;
}

export function isAdjacent(pos1: Position, pos2: Position): boolean {
  const dRow = Math.abs(pos1.row - pos2.row);
  const dCol = Math.abs(pos1.col - pos2.col);
  return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
}

export function swapGems(grid: Grid, pos1: Position, pos2: Position): Grid {
  const next = grid.map(row => [...row]);
  const temp = next[pos1.row][pos1.col];
  next[pos1.row][pos1.col] = next[pos2.row][pos2.col];
  next[pos2.row][pos2.col] = temp;
  return next;
}

export function findMatches(grid: Grid, swapAction?: { from: Position; to: Position }): MatchResult[] {
  const results: MatchResult[] = [];
  const matchedPositions = new Set<string>();

  // Check Horizontal Matches
  for (let r = 0; r < GRID_ROWS; r++) {
    let streak = 1;
    for (let c = 0; c < GRID_COLS; c++) {
      const current = grid[r][c];
      const next = c + 1 < GRID_COLS ? grid[r][c + 1] : null;

      if (current && next && current.type === next.type) {
        streak++;
      } else {
        if (streak >= 3) {
          const positions: Position[] = [];
          for (let i = 0; i < streak; i++) {
            const colIdx = c - streak + 1 + i;
            positions.push({ row: r, col: colIdx });
            matchedPositions.add(`${r},${colIdx}`);
          }

          let special: SpecialType = 'none';
          let specialPos = positions[Math.floor(positions.length / 2)];

          if (swapAction) {
            const hit = positions.find(p => (p.row === swapAction.to.row && p.col === swapAction.to.col) || (p.row === swapAction.from.row && p.col === swapAction.from.col));
            if (hit) specialPos = hit;
          }

          if (streak === 4) special = 'line_h';
          else if (streak >= 5) special = 'eye';

          results.push({
            matches: positions,
            type: grid[r][c]!.type,
            specialToCreate: special !== 'none' ? { pos: specialPos, special } : undefined,
          });
        }
        streak = 1;
      }
    }
  }

  // Check Vertical Matches
  for (let c = 0; c < GRID_COLS; c++) {
    let streak = 1;
    for (let r = 0; r < GRID_ROWS; r++) {
      const current = grid[r][c];
      const next = r + 1 < GRID_ROWS ? grid[r + 1][c] : null;

      if (current && next && current.type === next.type) {
        streak++;
      } else {
        if (streak >= 3) {
          const positions: Position[] = [];
          for (let i = 0; i < streak; i++) {
            const rowIdx = r - streak + 1 + i;
            positions.push({ row: rowIdx, col: c });
            matchedPositions.add(`${rowIdx},${c}`);
          }

          let special: SpecialType = 'none';
          let specialPos = positions[Math.floor(positions.length / 2)];

          if (swapAction) {
            const hit = positions.find(p => (p.row === swapAction.to.row && p.col === swapAction.to.col) || (p.row === swapAction.from.row && p.col === swapAction.from.col));
            if (hit) specialPos = hit;
          }

          if (streak === 4) special = 'line_v';
          else if (streak >= 5) special = 'eye';

          // If this intersects with an existing match, make it a Bomb!
          const hasIntersect = results.some(res =>
            res.type === grid[r][c]!.type &&
            res.matches.some(m => positions.some(p => p.row === m.row && p.col === m.col))
          );

          if (hasIntersect) {
            special = 'bomb';
          }

          results.push({
            matches: positions,
            type: grid[r][c]!.type,
            specialToCreate: special !== 'none' ? { pos: specialPos, special } : undefined,
          });
        }
        streak = 1;
      }
    }
  }

  return results;
}

export function hasPossibleMoves(grid: Grid): boolean {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const current = grid[r][c];
      if (!current || current.locked) continue;

      // Try swap right
      if (c + 1 < GRID_COLS && grid[r][c + 1] && !grid[r][c + 1]!.locked) {
        const swapped = swapGems(grid, { row: r, col: c }, { row: r, col: c + 1 });
        if (findMatches(swapped).length > 0) return true;
      }

      // Try swap down
      if (r + 1 < GRID_ROWS && grid[r + 1][c] && !grid[r + 1][c]!.locked) {
        const swapped = swapGems(grid, { row: r, col: c }, { row: r + 1, col: c });
        if (findMatches(swapped).length > 0) return true;
      }
    }
  }
  return false;
}

export function applyGravityAndRefill(grid: Grid): { newGrid: Grid; fallenGemsCount: number } {
  const newGrid: Grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
  let fallenGemsCount = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    let writeRow = GRID_ROWS - 1;

    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      const gem = grid[r][c];
      if (gem !== null) {
        if (r !== writeRow) fallenGemsCount++;
        newGrid[writeRow][c] = { ...gem, isNew: false };
        writeRow--;
      }
    }

    // Refill top gaps
    while (writeRow >= 0) {
      newGrid[writeRow][c] = createGem();
      fallenGemsCount++;
      writeRow--;
    }
  }

  return { newGrid, fallenGemsCount };
}

export function getDefensePhase(currentDefense: number, maxDefense: number): DefensePhase {
  const ratio = currentDefense / maxDefense;
  if (ratio > 0.75) return 'guarded';
  if (ratio > 0.50) return 'wavering';
  if (ratio > 0.25) return 'breakdown';
  return 'submissive';
}

/**
 * 玩家指定伤害规则：
 * 1消只能扣除1点。
 * 连消+1点。
 * 连锁消除 *2 或 *3。
 */
export function calculateMatchDamage(comboCount: number, hasSpecialExplosion: boolean = false): {
  damage: number;
  baseDamage: number;
  multiplier: number;
  bonusTitle: string;
} {
  // 1消只能扣除1点，连消+1点
  // 1消: 1点
  // 2连消: 1+1=2点
  // 3连消: 1+2=3点
  // 4连消: 1+3=4点
  const baseDamage = 1 + Math.max(0, comboCount - 1);

  // 连锁消除 *2 或 *3
  let multiplier = 1;
  let bonusTitle = '1消 (心防扣除 1 点)';

  if (comboCount === 1) {
    if (hasSpecialExplosion) {
      multiplier = 2;
      bonusTitle = '心魔秘宝引爆 (2x 连锁)';
    } else {
      multiplier = 1;
      bonusTitle = '1消基础 (扣除 1 点)';
    }
  } else if (comboCount === 2 || comboCount === 3) {
    multiplier = hasSpecialExplosion ? 3 : 2;
    bonusTitle = hasSpecialExplosion ? `${comboCount}连连锁·暴击 (3x)` : `${comboCount}连消连锁 (2x)`;
  } else {
    multiplier = 3;
    bonusTitle = `${comboCount}连极乐连锁 (3x)`;
  }

  const damage = baseDamage * multiplier;

  return {
    damage,
    baseDamage,
    multiplier,
    bonusTitle,
  };
}

export function calculateComboMultiplier(phase: DefensePhase, comboCount: number): {
  multiplier: number;
  bonusTitle: string;
  isCritical: boolean;
} {
  const { multiplier, bonusTitle } = calculateMatchDamage(comboCount);
  return {
    multiplier,
    bonusTitle,
    isCritical: comboCount >= 2,
  };
}

