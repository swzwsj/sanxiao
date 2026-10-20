import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleHelp, Film, Pause, Play, RotateCcw, Shield, Sparkles, Timer, Volume2, VolumeX } from 'lucide-react';
import { GameBoard } from './components/GameBoard';
import { SkillsBar } from './components/SkillsBar';
import { DemoDialog } from './components/DemoDialog';
import { DemoStage } from './components/DemoStage';
import { FilmSlot } from './components/FilmSlot';
import { GemIcon } from './components/GemIcon';
import { BattleOpening } from './components/BattleOpening';
import { BreakthroughReward } from './components/BreakthroughReward';
import { captureEncounterFrame, EncounterTransition } from './components/EncounterTransition';
import type { EncounterFrame } from './components/EncounterTransition';
import './styles/cinematic.css';
import { APPROACHES, DEMO_CHARACTER, DEMO_CONFIG, RESPONSES } from './data/demo';
import { BattleController } from './game/BattleController';
import { useBattle } from './game/useBattle';
import { filmEvent } from './integration/filmBridge';
import { soundManager } from './audio/soundManager';
import type { Approach, BattleResult } from './types/demo';
import type { Position } from './types/game';

const query = new URLSearchParams(window.location.search);
const embedded = query.get('embed') === '1';
const timed = Number(query.get('timed'));
const config = { ...DEMO_CONFIG, timeLimitSeconds: timed >= 10 && timed <= 600 ? timed : DEMO_CONFIG.timeLimitSeconds };
const displayTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const outcomes = { success: '会谈目标达成', partial: '会谈有所推进', failure: '会谈暂时中断' };
const reasons = { defense_broken: '三重心防已经突破。', turn_limit: '本场步数已用尽。', time_limit: '本场诊疗时间已用尽。', composure: '从容度耗尽，暂时失去主动权。' };

export default function App() {
  const [controller] = useState(() => new BattleController(config, { onSound: (kind, combo) => {
    if (kind === 'swap') soundManager.playGemSwap();
    if (kind === 'match') soundManager.playComboAscending(combo);
    if (kind === 'break') soundManager.playHeartBreak();
    if (kind === 'invalid') soundManager.playPenaltyBuzz();
    if (kind === 'skill') soundManager.playSkillCast();
  } }));
  const state = useBattle(controller);
  const [screen, setScreen] = useState<'before' | 'choice' | 'intro' | 'battle' | 'after'>(embedded ? 'intro' : 'before');
  const [approach, setApproach] = useState<Approach | null>(null);
  const appRoot = useRef<HTMLDivElement>(null);
  const entryLocked = useRef(false);
  const [encounter, setEncounter] = useState<EncounterFrame | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [help, setHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(soundManager.getMuted());
  const reported = useRef(new Set<string>());
  const continued = useRef(new Set<string>());

  useEffect(() => {
    filmEvent('xinfang:ready', { battleId: config.id });
    if (embedded) enterEncounter(query.get('approach') === 'direct' ? 'direct' : 'patient');
    return () => { controller.dispose(); soundManager.stopBgm(); };
  }, [controller]);
  useEffect(() => controller.setPaused(paused || help), [controller, paused, help]);
  useEffect(() => {
    if (state.status === 'playing' && !state.paused) soundManager.startBgm(state.phaseIndex);
    else soundManager.stopBgm();
    return () => soundManager.stopBgm();
  }, [state.status, state.paused, state.phaseIndex]);
  useEffect(() => {
    if (!state.result || reported.current.has(state.runId)) return;
    reported.current.add(state.runId);
    try { localStorage.setItem('xinfang_demo_last_result_v1', JSON.stringify(state.result)); } catch { /* The result is still returned when local storage is unavailable. */ }
    filmEvent('xinfang:complete', state.result);
  }, [state.result, state.runId]);

  const enterEncounter = (value: Approach) => {
    if (!appRoot.current || entryLocked.current || controller.getSnapshot().status !== 'ready') return;
    entryLocked.current = true;
    const frame = captureEncounterFrame(appRoot.current);
    setApproach(value); setEncounter(frame); setScreen('intro'); setSelected(null);
    if (!embedded) soundManager.playSkillCast();
  };
  const start = (value: Approach) => { controller.start(value); setScreen('battle'); setSelected(null); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const restart = (replayChoice = true) => {
    const previous = state.approach;
    controller.reset(); setSelected(null); setPaused(false); setHelp(false); setEncounter(null); entryLocked.current = false;
    if (replayChoice && !embedded) { setApproach(null); setScreen('choice'); }
    else start(previous);
  };
  const continueStory = (result: BattleResult) => {
    if (!continued.current.has(result.runId)) { continued.current.add(result.runId); filmEvent('xinfang:continue', result); }
    setScreen('after');
  };
  const busy = state.status !== 'playing' || state.paused;

  return <div ref={appRoot} data-app-root inert={Boolean(encounter)} className={`demo-app ${embedded ? 'demo-embedded' : ''}`}>
    <header className="demo-header">
      <div className="demo-brand"><img src="/assets/aistudio/b2a3a02cf5bbfd7d11bc912198b883cf_1be91f7b.jpg" alt="陆星河" /><div><strong>心防崩解<span>支配契约</span></strong><small>深渊与茧私人诊所</small></div></div>
      <nav className="demo-flow" aria-label="片段进度">{['剧情选择', '心防交锋', '会谈后续'].map((item, i) => <span key={item} className={(screen === 'before' || screen === 'choice' ? 0 : screen === 'battle' || screen === 'intro' ? 1 : 2) === i ? 'is-current' : ''}><b>0{i + 1}</b>{item}</span>)}</nav>
      <div className="demo-header-actions">
        <button className="demo-icon-button" title="玩法规则" aria-label="玩法规则" onClick={() => setHelp(true)}><CircleHelp size={18} /></button>
        <button className="demo-icon-button" title={muted ? '开启音效' : '静音'} aria-label={muted ? '开启音效' : '静音'} onClick={() => setMuted(soundManager.toggleMute())}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {screen === 'battle' && <button className="demo-secondary demo-restart" onClick={() => restart()} title="重新开始本场"><RotateCcw size={14} /><span>重开</span></button>}
      </div>
    </header>

    <main className="demo-main">
      {screen === 'before' && <FilmSlot position="before" config={config} onContinue={() => setScreen('choice')} />}
      {screen === 'choice' && <section className="demo-choice-screen">
        <div className="demo-choice-intro"><span className="demo-eyebrow">会谈中段 · 选择你的切入方式</span><h1>{config.title}</h1><p>他把问题推了回来。<br />你准备怎样让这场会谈继续？</p><div className="demo-choice-target"><img src={DEMO_CHARACTER.avatar} alt="裴予迟" /><span>裴予迟<small>“陆医生，你总是这样步步紧逼吗？”</small></span></div></div>
        <div className="demo-choices">{APPROACHES.map(item => <button key={item.id} className={`demo-choice ${approach === item.id ? 'is-selected' : ''}`} onClick={() => enterEncounter(item.id)}><span className="demo-choice-index">{item.id === 'direct' ? '01' : '02'}</span><span><strong>{item.title}</strong><span className="demo-choice-line">{item.line}</span><small><Sparkles size={12} />{item.effect}</small></span><ArrowRight size={17} /></button>)}
          <p className="demo-choice-reaction">做出选择，进入这场心防交锋。</p>
        </div>
      </section>}

      {screen === 'intro' && <BattleOpening key={state.runId} approach={approach ?? 'patient'} active={!encounter && !help} onComplete={() => start(approach ?? 'patient')} />}

      {screen === 'battle' && <>
        <div className="demo-battle-intro"><div><p className="demo-eyebrow">会谈目标</p><h1>{config.objective}</h1></div><div className="demo-budget"><span className="demo-turns" data-testid="turns"><Shield size={16} />剩余 <strong>{state.turnsRemaining}</strong> 步</span>{state.remainingMs !== null && <span className={state.remainingMs <= 15000 ? 'demo-time is-critical' : 'demo-time'} data-testid="time"><Timer size={15} />{Math.ceil(state.remainingMs / 1000)}s</span>}<button className="demo-icon-button" aria-label={paused ? '继续交锋' : '暂停交锋'} onClick={() => setPaused(value => !value)} disabled={state.status !== 'playing'}>{paused ? <Play size={17} /> : <Pause size={17} />}</button></div></div>
        <div className="demo-arena"><section className="demo-board-column" aria-label="三消棋盘与技能">
          <GameBoard grid={state.grid} selectedPos={selected} onSelectPos={pos => { if (!busy) { setSelected(pos.row < 0 ? null : pos); soundManager.playGemSelect(); } }} onSwap={(from, to) => { if (busy) return; if (Math.abs(from.row - to.row) + Math.abs(from.col - to.col) !== 1) { setSelected(to); return; } setSelected(null); void controller.swap(from, to); }} isProcessing={busy} onHint={() => controller.hint()} hintPositions={state.hint} comboCount={state.combo} lastMultiplier={state.multiplier} bonusTitle={state.bonusTitle} />
          <p className="demo-board-tip">{state.vulnerabilityTurns > 0 ? `创伤回溯生效 · 接下来 ${state.vulnerabilityTurns} 次有效交换伤害 +40%` : state.turnsUsed === 0 ? '首局提示：中央的「恶女之瞳」与相邻宝石交换，可清除全盘同色宝石。' : '有效交换消耗 1 步 · 技能消耗 SP，不耗步数 · 洞察可免费提示'}</p>
          <SkillsBar currentSp={state.sp} maxSp={100} onCastSkill={skill => { setSelected(null); void controller.cast(skill); }} isProcessing={busy || state.turnsUsed === 0 || state.skillUsedThisTurn} composure={state.composure} maxComposure={100} />
          <div className="demo-battle-note"><span>{state.turnsUsed === 0 ? '首次有效交换后可使用技能' : state.skillUsedThisTurn ? '本回合技能已用，交换后可再次释放' : '每次有效交换后可释放 1 个技能'}</span><span>已突破 {state.result?.phasesCleared ?? state.phaseIndex} / {config.phases.length} 重心防</span></div>
        </section><DemoStage state={state} config={config} /></div>
      </>}

      {screen === 'after' && <FilmSlot position="after" config={config} result={state.result} onContinue={() => { controller.reset(); setScreen('before'); setApproach(null); setPaused(false); }} />}
    </main>

    {state.status === 'dialogue' && screen === 'battle' && <DemoDialog title="他没有再用玩笑带过" wide><div className="demo-dialog-body"><p className="demo-dialog-speaker">裴予迟</p><p className="demo-dialog-quote">“如果我不想回答呢？你是不是也会替我下结论？”</p><p className="demo-muted">第一重心防已突破。此刻，交锋暂停，选择如何继续。</p><div className="demo-response-choices">{RESPONSES.map(item => <button key={item.id} className="demo-choice" onClick={() => controller.chooseResponse(item.id)}><span><strong>{item.title}</strong><span className="demo-choice-line">{item.line}</span><small>{item.effect}</small></span><ArrowRight size={16} /></button>)}</div></div></DemoDialog>}

    {state.result?.outcome === 'success' && screen === 'battle' && <BreakthroughReward key={state.result.runId} result={state.result} config={config} onContinue={() => continueStory(state.result!)} onRetry={() => restart(false)} />}
    {state.result && state.result.outcome !== 'success' && screen === 'battle' && <DemoDialog title={outcomes[state.result.outcome]}><div className="demo-dialog-body demo-result"><span className={`demo-grade grade-${state.result.grade}`}>{state.result.grade}</span><p className="demo-result-summary">{state.result.outcome === 'partial' ? '他的防线已经松动，但有些话仍被保留。你可以带着这份距离继续剧情。' : '这次没有打开话题。可以重新尝试，也可以接受这场会谈的结果。'}</p><p className="demo-muted">{reasons[state.result.reason]} 本次未获得击破进度。</p><div className="demo-result-stats"><div><strong>{state.result.turnsUsed}</strong><span>有效交换</span></div><div><strong>{state.result.maxCombo}</strong><span>最大连锁</span></div><div><strong>{state.result.composure}</strong><span>剩余从容</span></div><div><strong>{displayTime(state.result.activeTimeMs)}</strong><span>操作用时</span></div></div><div className="demo-choice-record"><span>你的选择</span><strong>{APPROACHES.find(item => item.id === state.result!.approach)?.title}</strong>{state.result.response && <strong>{RESPONSES.find(item => item.id === state.result!.response)?.title}</strong>}</div><div className="demo-result-actions"><button className="demo-secondary" onClick={() => restart(false)}><RotateCcw size={15} />再试一次</button><button className="demo-primary" onClick={() => continueStory(state.result!)}><Film size={15} />回到剧情<ArrowRight size={15} /></button></div></div></DemoDialog>}

    {paused && !help && state.status === 'playing' && <DemoDialog title="会谈已暂停" onClose={() => setPaused(false)}><div className="demo-dialog-body"><p className="demo-muted">步数、时限与棋盘都会保留。</p><button className="demo-primary" onClick={() => setPaused(false)}><Play size={16} />继续交锋</button></div></DemoDialog>}

    {help && <DemoDialog title="心防交锋 · 玩法规则" onClose={() => setHelp(false)} wide><div className="demo-dialog-body demo-help"><p>交换相邻宝石，凑成横向或纵向三个同色。有效交换消耗 1 步，连续掉落形成连锁，只计算为这 1 步。</p><div className="demo-gem-legend">{([{ type: 'seduction', text: '诱惑 · 充能 SP' }, { type: 'hypnosis', text: '催眠 · 从容 +1' }, { type: 'empathy', text: '伪装 · 从容 +2' }, { type: 'desire', text: '欲望 · SP +2' }, { type: 'trauma', text: '创伤 · 额外伤害' }] as const).map(item => <div key={item.type}><GemIcon type={item.type} size={34} /><span>{item.text}</span></div>)}</div><p><strong>伤害与特殊宝石</strong><br />每颗命中宝石造成 1 点伤害，创伤宝石额外 +1。每多一轮连锁，该轮额外 +2。四消生成行／列宝石，L／T 型生成炸弹，直线五消生成恶女之瞳；恶女之瞳与任意相邻宝石交换可清色，两个特殊宝石可组合引爆。</p><p><strong>技能与障碍</strong><br />每次有效交换后可释放 1 个技能；技能只消耗 SP，不消耗步数，并解除所有锁链。锁链也可通过相邻消除解除；心火在 3 次有效交换后爆发，每颗扣除 18 从容。无效交换不扣步数，扣除 4 从容。</p><p><strong>怎样结束本场</strong><br />突破所有心防即达成目标；最后一步会先完成所有连锁，再判胜负。步数／时限耗尽或从容度归零，会按已突破的阶段返回本场结果。剧情选择与战斗评级分别记录。</p><p className="demo-muted">当前{config.timeLimitSeconds === null ? '采用步数制，没有实时倒计时' : `采用 ${config.timeLimitSeconds} 秒限时模式`}。阅读规则、剧情选择、暂停与消除演出均不扣时。洞察免费使用。</p><button className="demo-primary" onClick={() => setHelp(false)}>明白了<Check size={16} /></button></div></DemoDialog>}
    {encounter && <EncounterTransition frame={encounter} onComplete={() => { setEncounter(null); entryLocked.current = false; window.scrollTo({ top: 0, behavior: 'instant' }); }} />}
  </div>;
}
