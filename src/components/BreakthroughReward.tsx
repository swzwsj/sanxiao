import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import type { BattleResult, DemoConfig } from '../types/demo';
import { DemoDialog } from './DemoDialog';

export function BreakthroughReward({ result, config, onContinue, onRetry }: { result: BattleResult; config: DemoConfig; onContinue: () => void; onRetry: () => void }) {
  const [progress, setProgress] = useState(result.progressBefore);
  const [ready, setReady] = useState(false);
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setProgress(result.breakProgress); setReady(true); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const amount = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - amount) ** 3;
      setProgress(result.progressBefore + Math.round(result.progressDelta * eased));
      if (amount < 1) frame = requestAnimationFrame(tick);
      else setReady(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [result.runId, result.progressBefore, result.progressDelta, result.breakProgress]);
  useEffect(() => { if (ready) next.current?.focus(); }, [ready]);
  return <DemoDialog title="心防击破" wide>
    <div className="breakthrough-reward" data-testid="breakthrough-reward">
      <div className="breakthrough-emblem"><Sparkles size={22} /><span>本场交锋成功</span></div>
      <p className="breakthrough-gain" data-testid="progress-gain">+{progress - result.progressBefore}</p>
      <p className="breakthrough-label">击破进度</p>
      <div className="breakthrough-progress-heading"><span>裴予迟 · 心防击破进度</span><strong data-testid="break-progress">{progress}<small> / {config.breakProgress.maximum}</small></strong></div>
      <div className="breakthrough-progress" role="progressbar" aria-label="心防击破进度" aria-valuemin={0} aria-valuemax={config.breakProgress.maximum} aria-valuenow={progress}><div style={{ transform: `scaleX(${progress / config.breakProgress.maximum})` }} /></div>
      <p className="breakthrough-quote">{result.response === 'press' ? '“……好，我不躲。你继续问。”' : '“这一次，我会把话说完。”'}</p>
      <div className="breakthrough-next"><span>后续剧情节点</span><strong>{config.nextNode.title}</strong><small>本场评级 {result.grade} · {result.turnsUsed} 次交换 · 最大 {result.maxCombo} 连锁</small></div>
      <div className="demo-result-actions"><button className="demo-secondary" disabled={!ready} onClick={onRetry}><RotateCcw size={14} />再试一次</button><button ref={next} className="demo-primary" disabled={!ready} onClick={onContinue}>进入后续剧情<ArrowRight size={16} /></button></div>
    </div>
  </DemoDialog>;
}
