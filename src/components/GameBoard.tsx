import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, PointerEvent } from 'react';
import { ArrowDown, ArrowRight, Eye, Flame, Lightbulb, Sparkles, Zap } from 'lucide-react';
import type { ClearFeedback, Grid, Position } from '../types/game';
import { GemIcon } from './GemIcon';
import { EliminationNotice } from './EliminationNotice';
import './GameBoard.css';

interface GameBoardProps {
  grid: Grid; selectedPos: Position | null; onSelectPos: (pos: Position) => void;
  onSwap: (from: Position, to: Position) => void; isProcessing: boolean; onHint: () => void;
  hintPositions: Position[] | null; comboCount: number; lastMultiplier: number; bonusTitle: string;
  feedback?: ClearFeedback | null; streak?: number;
}
const COLORS = { seduction: '#fb7185', hypnosis: '#38bdf8', empathy: '#34d399', desire: '#fbbf24', trauma: '#c084fc' };
const GEM_NAMES = { seduction: '诱惑', hypnosis: '催眠', empathy: '伪装', desire: '欲望', trauma: '创伤' };
const SPECIAL_NAMES = { none: '', line_h: '横向冲击针', line_v: '纵向冲击针', bomb: '心灵炸弹', eye: '恶女之瞳' };
const same = (a: Position | null, b: Position) => a?.row === b.row && a?.col === b.col;
const center = (n: number) => (n + .5) / 7 * 100;

/** A resolution ID, rather than coordinates, triggers every repeated clear. */
function ClearEffects({ feedback }: { feedback: ClearFeedback }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 850); return () => clearTimeout(timer); }, []);
  if (!visible) return null;
  const big = feedback.kind !== 'three' || feedback.chain > 1;
  const cells = feedback.cells.filter((_, index) => index % Math.max(1, Math.ceil(feedback.cells.length / 24)) === 0);
  const origin = feedback.combination?.origin ?? feedback.activated.find(item => item.special === 'eye')?.pos;
  return <div className={`clear-fx ${big ? 'is-strong' : ''}`} data-testid="clear-effects" data-wave={feedback.id} aria-hidden="true">
    {origin && <svg className="clear-resonance" viewBox="0 0 700 700">{feedback.cells.map(({ pos }, i) => <line key={i} x1={(origin.col + .5) * 100} y1={(origin.row + .5) * 100} x2={(pos.col + .5) * 100} y2={(pos.row + .5) * 100} />)}</svg>}
    {feedback.activated.slice(0, 8).map(({ pos, special }, i) => special === 'line_h' || special === 'line_v'
      ? <i key={`beam-${i}`} className={`clear-beam ${special}`} style={{ '--cell-x': `${center(pos.col)}%`, '--cell-y': `${center(pos.row)}%` } as CSSProperties} />
      : <i key={`blast-${i}`} className={`clear-shockwave ${special}`} style={{ left: `${center(pos.col)}%`, top: `${center(pos.row)}%` }} />)}
    {cells.flatMap(({ pos, type }, index) => Array.from({ length: big ? 4 : 3 }, (_, part) => {
      const angle = part / (big ? 4 : 3) * Math.PI * 2 + index * .7;
      const distance = big ? 35 + index % 3 * 12 : 25;
      return <i key={`${index}-${part}`} className={`clear-shard ${part % 2 ? 'is-round' : ''}`} style={{ left: `${center(pos.col)}%`, top: `${center(pos.row)}%`, '--shard-color': COLORS[type], '--dx': `${Math.cos(angle) * distance}px`, '--dy': `${Math.sin(angle) * distance}px`, '--rotation': `${index * 37 + part * 80}deg`, '--delay': `${part * 12}ms` } as CSSProperties} />;
    }))}
    {feedback.created.map(({ pos, special }, index) => <div key={`made-${index}`} className="clear-creation" style={{ left: `${center(pos.col)}%`, top: `${center(pos.row)}%` }}><Sparkles size={22} /><span>{SPECIAL_NAMES[special]}</span></div>)}
  </div>;
}

export function GameBoard({ grid, selectedPos, onSelectPos, onSwap, isProcessing, onHint, hintPositions, comboCount, lastMultiplier, feedback, streak = 0 }: GameBoardProps) {
  const [shake, setShake] = useState<Position | null>(null);
  const dragged = useRef<Position | null>(null);
  const touchStart = useRef<{ pos: Position; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const lockTimer = useRef<number>(0);
  const previousPositions = useRef(new Map(grid.flatMap((line, row) => line.flatMap((gem, col) => gem ? [[gem.id, { row, col }] as const] : []))));
  useLayoutEffect(() => { previousPositions.current = new Map(grid.flatMap((line, row) => line.flatMap((gem, col) => gem ? [[gem.id, { row, col }] as const] : []))); }, [grid]);
  useEffect(() => () => clearTimeout(lockTimer.current), []);
  const shakeLocked = (pos: Position) => { setShake(pos); clearTimeout(lockTimer.current); lockTimer.current = window.setTimeout(() => setShake(null), 300); };
  const select = (pos: Position) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (isProcessing || !grid[pos.row]?.[pos.col]) return;
    if (grid[pos.row][pos.col]?.locked) { shakeLocked(pos); return; }
    if (!selectedPos) onSelectPos(pos);
    else if (same(selectedPos, pos)) onSelectPos({ row: -1, col: -1 });
    else onSwap(selectedPos, pos);
  };
  const startDrag = (event: DragEvent, pos: Position) => {
    if (isProcessing || grid[pos.row][pos.col]?.locked) { event.preventDefault(); return; }
    dragged.current = pos; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `${pos.row},${pos.col}`);
  };
  const drop = (event: DragEvent, pos: Position) => {
    event.preventDefault();
    if (!isProcessing && dragged.current) { if (grid[pos.row][pos.col]?.locked) shakeLocked(pos); else onSwap(dragged.current, pos); }
    dragged.current = null;
  };
  const finishSwipe = (event: PointerEvent) => {
    const start = touchStart.current; touchStart.current = null;
    if (!start || isProcessing) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    const to = { row: start.pos.row + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0), col: start.pos.col + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0) };
    if (to.row < 0 || to.row > 6 || to.col < 0 || to.col > 6) return;
    suppressClick.current = true; onSwap(start.pos, to);
  };
  return <div className="match-board relative" data-testid="game-board" data-processing={isProcessing}>
    <div className="match-board-heading demo-board-top"><div className="match-board-status" aria-live="polite" aria-atomic="true" data-testid="match-feedback" data-kind={feedback?.kind ?? 'ready'} data-chain={comboCount}>
      <strong>{feedback ? feedback.title : '连成同色，打开他的心防'}</strong><span>{feedback ? `${feedback.count} 颗命中 · 心防 −${feedback.damage}${feedback.detail ? ` · ${feedback.detail}` : ''}` : '四消合成冲击针 · 五消合成恶女之瞳'}</span>
    </div><button className="match-hint" onClick={onHint} disabled={isProcessing} title="心理洞察提示" aria-label="心理洞察提示"><Lightbulb size={17} /><span>洞察</span></button></div>
    <div className="match-chain-bar"><span className={comboCount > 1 ? 'is-active' : ''}><Zap size={13} />连锁 {comboCount} 轮 <b>×{lastMultiplier.toFixed(2)}</b></span><span className={streak >= 3 ? 'is-active' : ''}><Flame size={13} />连续命中 {streak}{streak >= 3 ? ' · SP +3' : ''}</span></div>
    <div className="match-board-frame"><div className="match-grid-wrap">
      <div className="grid grid-cols-7 gap-2 match-grid" role="group" aria-label="7行7列宝石棋盘" onPointerUp={finishSwipe} onPointerCancel={() => { touchStart.current = null; }}>
        {grid.map((line, row) => line.map((gem, col) => {
          const pos = { row, col }, selected = same(selectedPos, pos), hinted = hintPositions?.some(item => same(item, pos));
          const old = gem ? previousPositions.current.get(gem.id) : null;
          const fromX = old ? old.col - col : 0, fromY = old ? old.row - row : -Math.min(4, row + 1);
          const moving = gem && (fromX !== 0 || fromY !== 0);
          return <button key={`${row}-${col}`} type="button" data-row={row} data-col={col} data-gem={gem?.type} data-gem-id={gem?.id} data-special={gem?.special} data-locked={gem?.locked ? 'true' : 'false'} data-matching={Boolean(gem?.isMatching)} aria-label={`第${row + 1}行第${col + 1}列 ${gem ? GEM_NAMES[gem.type] : '空'} ${gem ? SPECIAL_NAMES[gem.special] : ''}${gem?.locked ? ' 已锁定' : ''}`} aria-pressed={selected} disabled={isProcessing}
            className={`match-tile ${selected ? 'is-selected' : ''} ${hinted ? 'ring-amber-400 is-hinted' : ''} ${same(shake, pos) ? 'is-shaking' : ''} ${gem?.isMatching ? 'is-clearing' : ''}`}
            onKeyDown={event => { const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key]; if (delta) { event.preventDefault(); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-row="${row + delta[0]}"][data-col="${col + delta[1]}"]`)?.focus(); } }}
            onClick={() => select(pos)} draggable={Boolean(gem && !gem.locked && !isProcessing)} onDragStart={event => startDrag(event, pos)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, pos)} onDragEnd={() => { dragged.current = null; }}
            onPointerDown={event => { if (event.pointerType !== 'mouse' && !isProcessing && gem && !gem.locked) { suppressClick.current = false; touchStart.current = { pos, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); } }}>
            {gem && <div key={`${gem.id}-${row}-${col}`} className={`gem-motion ${moving ? 'is-moving' : ''}`} style={{ '--from-x': `${fromX * 115}%`, '--from-y': `${fromY * 115}%` } as CSSProperties}><GemIcon type={gem.type} special={gem.special} locked={gem.locked} fireCountdown={gem.fireCountdown} size={46} /></div>}
          </button>;
        }))}
      </div>{feedback && <><ClearEffects key={`fx-${feedback.id}`} feedback={feedback} /><EliminationNotice key={`notice-${feedback.id}`} feedback={feedback} /></>}
    </div></div>
    <div className="match-pattern-key" aria-label="特殊消除速查"><span><ArrowRight size={13} /><ArrowDown size={13} />四消 · 清行／列</span><span><Sparkles size={13} />L / T · 炸弹</span><span><Eye size={13} />五消以上 · 清色 +1步</span></div>
  </div>;
}
