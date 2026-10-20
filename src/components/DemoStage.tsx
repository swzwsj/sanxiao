import { Check, Flame, Heart, MessageSquareQuote, Shield, Timer } from 'lucide-react';
import type { BattleState, DemoConfig } from '../types/demo';
import { DEMO_CHARACTER } from '../data/demo';

export function DemoStage({ state, config }: { state: BattleState; config: DemoConfig }) {
  const phase = config.phases[state.phaseIndex];
  return <section className="demo-stage" aria-label="裴予迟的心防状态">
    <div className="demo-stage-heading"><div><span className="demo-eyebrow">本场对手</span><h2>{DEMO_CHARACTER.name}<span>{phase.name}</span></h2></div>
      <div className="demo-enemy" title={`${state.enemyCooldown} 次有效交换后反制`}><Flame size={17} /><span>{state.enemyCooldown}</span></div>
    </div>
    <div className="demo-defense-label"><span><Shield size={14} />第 {state.phaseIndex + 1} 重心防</span><strong data-testid="defense">{state.defense}<small> / {phase.defense}</small></strong></div>
    <div className="demo-defense-track"><div style={{ width: `${state.defense / phase.defense * 100}%` }} /></div>
    <div className={`demo-portrait demo-portrait-phase-${state.phaseIndex}`}>
      <img src={DEMO_CHARACTER.portrait} alt="裴予迟" />
      <div className="demo-portrait-tag"><Heart size={12} />{['仍在试探你的意图', '笑意收起，防线动摇', '他开始认真听你说话'][Math.min(state.phaseIndex, 2)]}</div>
      {state.lastDamage > 0 && <div key={`${state.turnsUsed}-${state.combo}-${state.defense}`} className="demo-damage">−{state.lastDamage}</div>}
      <div className="demo-character-line" aria-live="polite"><span><MessageSquareQuote size={14} />{state.message.startsWith('“') ? DEMO_CHARACTER.name : '会谈动态'}</span><p>{state.message}</p></div>
    </div>
    <div className="demo-phase-track">{config.phases.map((item, index) => <div key={item.name} className={index <= state.phaseIndex ? 'is-reached' : ''}><span>{index < state.phaseIndex ? <Check size={12} /> : index + 1}</span>{item.name}</div>)}</div>
    {state.remainingMs !== null && <p className="demo-timer-note"><Timer size={12} />本场限时；剧情、规则、暂停与消除演出不扣时。</p>}
  </section>;
}
