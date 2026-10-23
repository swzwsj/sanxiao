import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import type { ClearFeedback } from '../types/game';
import './EliminationNotice.css';

const LABELS = { three: '三连消', four: '四连消', five: '五连消', cross: '交叉消除', special: '特殊消除' };
/** Transparent combat lettering; no panel, scrim or pointer interception. */
export function EliminationNotice({ feedback }: { feedback: ClearFeedback }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 1050); return () => clearTimeout(timer); }, []);
  if (!visible) return null;
  const title = feedback.combination ? feedback.title : feedback.kind === 'long' ? feedback.title.split('·')[0].trim() : LABELS[feedback.kind];
  const subtitle = feedback.kind === 'four' ? '冲击针形成' : feedback.kind === 'five' || feedback.kind === 'long' ? '恶女之瞳形成' : feedback.kind === 'cross' ? '心灵炸弹形成' : feedback.combination ? '共鸣引爆' : '';
  const chained = feedback.chain > 1;
  return <div className={`elimination-notice ${chained ? 'has-chain' : ''}`} data-testid="elimination-notice" data-kind={feedback.kind} data-wave={feedback.id} role="status" aria-live="polite" style={{ '--notice-duration': '1000ms' } as CSSProperties}>
    <svg className="elimination-streaks" viewBox="0 0 260 120" aria-hidden="true"><path d="M8 40h50m-40 9h25M202 72h50m-30 9h20M48 105h47m75-94h45" /><path className="elimination-diamond" d="m27 71 5 5-5 5-5-5Zm203-43 4 4-4 4-4-4Z" /></svg>
    <div className="elimination-lettering">{chained ? <div className="elimination-chain"><b>{feedback.chain}</b><span>连锁<strong>×{feedback.multiplier.toFixed(2)}</strong></span></div> : <strong className="elimination-title">{title}</strong>}
      {chained && <strong className="elimination-chain-title">{title}</strong>}
      {subtitle && <span className="elimination-subtitle">{subtitle}</span>}
      <div className="elimination-reward">{feedback.damage > 0 && <span>心防 <b>−{feedback.damage}</b></span>}{feedback.extraTurn && <span className="elimination-extra"><Sparkles size={13} />步数 +1</span>}</div>
    </div>
  </div>;
}
