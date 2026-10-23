import { useRef, useState } from 'react';
import { Check, Flame, Heart, MessageCircle, Shield, Timer } from 'lucide-react';
import type { BattleState, DemoConfig } from '../types/demo';
import { DEMO_CHARACTER, DEMO_HEROINE } from '../data/demo';
import { CharacterSpeechBubble, type CharacterSpeechHandle } from './CharacterSpeechBubble';
import './DemoStage.css';

export function DemoStage({ state, config, onNextStory, onReplayStory }: { state: BattleState; config: DemoConfig; onNextStory: (id: number, lineIndex: number) => void; onReplayStory: (id: number) => void }) {
  const [automatic, setAutomatic] = useState(true);
  const speech = useRef<CharacterSpeechHandle>(null);
  const phase = config.phases[state.phaseIndex];
  const story = state.story;
  const line = story?.lines[story.lineIndex];
  const heroine = line?.speaker === 'heroine';
  const storyActive = state.status === 'playing' || state.status === 'resolving';
  const speaker = heroine ? DEMO_HEROINE : DEMO_CHARACTER;
  return <section className="demo-stage" aria-label="裴予迟的心防状态">
    <div className="demo-stage-heading"><div><span className="demo-eyebrow">本场对手</span><h2>{DEMO_CHARACTER.name}<span>{phase.name}</span></h2></div>
      <div className="demo-enemy" title={`${state.enemyCooldown} 次有效交换后反制`}><Flame size={17} /><span>{state.enemyCooldown}</span></div>
    </div>
    <div className="demo-defense-label"><span><Shield size={14} />第 {state.phaseIndex + 1} 重心防</span><strong data-testid="defense">{state.defense}<small> / {phase.defense}</small></strong></div>
    <div className="demo-defense-track"><div style={{ width: `${state.defense / phase.defense * 100}%` }} /></div>
    <div className={`demo-portrait demo-portrait-phase-${state.phaseIndex} ${heroine ? 'is-heroine-speaking' : ''}`}>
      <button type="button" className="portrait-interact" onClick={() => speech.current?.interact()} disabled={!storyActive || state.paused || !story} aria-label={`与${speaker.name}交谈`}>
        <img key={line?.speaker} src={speaker.portrait} alt={`${speaker.name}立绘`} />
        <span className="portrait-interact-hint"><MessageCircle size={13} />点击人物交谈</span>
      </button>
      <div className="demo-portrait-tag"><Heart size={12} />{heroine ? '陆星河正在回应' : ['仍在试探你的意图', '笑意收起，防线动摇', '他开始认真听你说话'][Math.min(state.phaseIndex, 2)]}</div>
      {state.lastDamage > 0 && <div key={`${state.turnsUsed}-${state.combo}-${state.defense}`} className="demo-damage">−{state.lastDamage}</div>}
      {story && <CharacterSpeechBubble ref={speech} story={story} speaker={speaker.name} active={storyActive && !state.paused} automatic={automatic} onToggleAutomatic={() => setAutomatic(value => !value)} onNextStory={onNextStory} onReplayStory={onReplayStory} />}
    </div>
    <div className="demo-phase-track">{config.phases.map((item, index) => <div key={item.name} className={index <= state.phaseIndex ? 'is-reached' : ''}><span>{index < state.phaseIndex ? <Check size={12} /> : index + 1}</span>{item.name}</div>)}</div>
    <p className="battle-stage-event">{state.message}</p>
    {state.remainingMs !== null && <p className="demo-timer-note"><Timer size={12} />台词随交锋播放；规则、暂停与消除演出不扣时。</p>}
  </section>;
}
