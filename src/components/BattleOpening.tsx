import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronsRight, Shield } from 'lucide-react';
import { APPROACHES, DEMO_CHARACTER, DEMO_HEROINE, OPENING_DIALOGUE } from '../data/demo';
import type { Approach } from '../types/demo';

export function BattleOpening({ approach, active, onComplete }: { approach: Approach; active: boolean; onComplete: () => void }) {
  const lines = OPENING_DIALOGUE[approach];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const line = lines[index];
  const full = visible >= line.text.length;
  const last = index === lines.length - 1;
  useEffect(() => {
    if (!active) return;
    next.current?.focus();
  }, [active]);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(line.text.length); return; }
    setVisible(0);
    const timer = window.setInterval(() => setVisible(count => {
      if (count + 1 >= line.text.length) clearInterval(timer);
      return Math.min(line.text.length, count + 1);
    }), 28);
    return () => clearInterval(timer);
  }, [active, index, line.text]);
  const advance = () => {
    if (!active) return;
    if (!full) { setVisible(line.text.length); return; }
    if (last) onComplete();
    else setIndex(value => value + 1);
  };
  return <section className="battle-opening" aria-label="战前对话" data-testid="battle-opening" data-active={active}>
    <div className="opening-setting" aria-hidden="true"><div className="opening-window" /><div className="opening-floor" /></div>
    <div className="opening-heading"><span>深渊与茧 · 会谈中段</span><button className="opening-skip" disabled={!active} onClick={onComplete}>跳过对话<ChevronsRight size={15} /></button></div>
    <div className={`opening-actor opening-heroine ${line.speaker === 'heroine' ? 'is-speaking' : ''}`}><img src={DEMO_HEROINE.portrait} alt="陆星河立绘" /></div>
    <div className={`opening-actor opening-target ${line.speaker === 'target' ? 'is-speaking' : ''}`}><img src={DEMO_CHARACTER.portrait} alt="裴予迟立绘" /></div>
    <div className="opening-confrontation" aria-hidden="true"><span>视线交汇</span><i /></div>
    <div className="opening-dialogue">
      <div className="opening-speaker"><strong>{line.speaker === 'heroine' ? DEMO_HEROINE.name : DEMO_CHARACTER.name}</strong><span>{line.speaker === 'heroine' ? '心理咨询师' : '会谈对象'}</span><small>{index + 1} / {lines.length}</small></div>
      <button className="opening-line" onClick={advance} disabled={!active} aria-label={full ? '推进台词' : '显示完整台词'}><span aria-hidden="true">{active ? line.text.slice(0, visible) : ''}<i className={full ? 'is-finished' : ''} /></span><span className="sr-only" aria-live="polite">{active ? line.text : ''}</span></button>
      <div className="opening-dialogue-footer"><span><Shield size={12} />{APPROACHES.find(item => item.id === approach)?.effect}</span><button ref={next} className="demo-primary" onClick={advance} disabled={!active}>{last ? '开始心防交锋' : '继续对话'}<ArrowRight size={15} /></button></div>
    </div>
  </section>;
}
