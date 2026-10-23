import { useEffect, useState } from 'react';
import { ArrowRight, Check, Flame, Heart, MessageSquareQuote, Pause, Play, Shield, Timer } from 'lucide-react';
import type { BattleState, DemoConfig } from '../types/demo';
import { DEMO_CHARACTER, DEMO_HEROINE } from '../data/demo';
import './DemoStage.css';

export function DemoStage({ state, config, onNextStory }: { state: BattleState; config: DemoConfig; onNextStory: (id: number, lineIndex: number) => void }) {
  const [automatic, setAutomatic] = useState(true);
  const phase = config.phases[state.phaseIndex];
  const story = state.story;
  const line = story?.lines[story.lineIndex];
  const heroine = line?.speaker === 'heroine';
  const last = !story || story.lineIndex >= story.lines.length - 1;
  const storyActive = state.status === 'playing' || state.status === 'resolving';
  const advance = () => { if (story) onNextStory(story.id, story.lineIndex); };
  useEffect(() => {
    if (!automatic || last || !story || state.paused || !storyActive) return;
    let timer = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = window.setTimeout(() => onNextStory(story.id, story.lineIndex), Math.max(3600, (line?.text.length ?? 0) * 100));
    };
    schedule(); document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [automatic, last, story?.id, story?.lineIndex, state.paused, storyActive, line?.text.length, onNextStory]);
  return <section className="demo-stage" aria-label="裴予迟的心防状态">
    <div className="demo-stage-heading"><div><span className="demo-eyebrow">本场对手</span><h2>{DEMO_CHARACTER.name}<span>{phase.name}</span></h2></div>
      <div className="demo-enemy" title={`${state.enemyCooldown} 次有效交换后反制`}><Flame size={17} /><span>{state.enemyCooldown}</span></div>
    </div>
    <div className="demo-defense-label"><span><Shield size={14} />第 {state.phaseIndex + 1} 重心防</span><strong data-testid="defense">{state.defense}<small> / {phase.defense}</small></strong></div>
    <div className="demo-defense-track"><div style={{ width: `${state.defense / phase.defense * 100}%` }} /></div>
    <div className={`demo-portrait demo-portrait-phase-${state.phaseIndex} ${heroine ? 'is-heroine-speaking' : ''}`}>
      <img key={heroine ? 'heroine' : 'target'} src={heroine ? DEMO_HEROINE.portrait : DEMO_CHARACTER.portrait} alt={`${heroine ? DEMO_HEROINE.name : DEMO_CHARACTER.name}立绘`} />
      <div className="demo-portrait-tag"><Heart size={12} />{heroine ? '陆星河正在回应' : ['仍在试探你的意图', '笑意收起，防线动摇', '他开始认真听你说话'][Math.min(state.phaseIndex, 2)]}</div>
      {state.lastDamage > 0 && <div key={`${state.turnsUsed}-${state.combo}-${state.defense}`} className="demo-damage">−{state.lastDamage}</div>}
      <div className="battle-story" data-testid="battle-story" data-beat={story?.id} data-line={story?.lineIndex} role="region" aria-label="战斗剧情">
        <div className="battle-story-speaker"><span><MessageSquareQuote size={14} />{heroine ? DEMO_HEROINE.name : DEMO_CHARACTER.name}</span>{story && <small>{story.lineIndex + 1} / {story.lines.length}</small>}</div>
        <p key={`${story?.id}-${story?.lineIndex}`} className="battle-story-line" aria-live="polite">{line?.text ?? state.message}</p>
        <div className="battle-story-controls"><button type="button" onClick={() => setAutomatic(value => !value)} aria-label={automatic ? '关闭台词自动播放' : '开启台词自动播放'} aria-pressed={automatic}>{automatic ? <Pause size={12} /> : <Play size={12} />}{automatic ? '自动播放' : '手动播放'}</button>{!last && <button type="button" onClick={advance} disabled={state.paused || state.status === 'finished'} aria-label="下一句台词">下一句<ArrowRight size={13} /></button>}</div>
      </div>
    </div>
    <div className="demo-phase-track">{config.phases.map((item, index) => <div key={item.name} className={index <= state.phaseIndex ? 'is-reached' : ''}><span>{index < state.phaseIndex ? <Check size={12} /> : index + 1}</span>{item.name}</div>)}</div>
    <p className="battle-stage-event">{state.message}</p>
    {state.remainingMs !== null && <p className="demo-timer-note"><Timer size={12} />台词随交锋播放；规则、暂停与消除演出不扣时。</p>}
  </section>;
}
