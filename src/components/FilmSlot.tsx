import { ArrowRight, Film, Play } from 'lucide-react';
import { DEMO_CHARACTER } from '../data/demo';
import type { BattleResult, DemoConfig } from '../types/demo';

export function FilmSlot({ position, config, result, onContinue }: { position: 'before' | 'after'; config: DemoConfig; result?: BattleResult | null; onContinue: () => void }) {
  const src = position === 'before' ? config.media.before : result ? config.media.after[result.outcome] : '';
  const title = position === 'before' ? '话说到一半，他忽然沉默。' : result?.outcome === 'success' ? '这一次，他没有打断你。' : result?.outcome === 'partial' ? '有些话，还没有说出口。' : '今天的会谈，暂时停在这里。';
  return <section className="demo-film-slot" data-film-slot={position} data-story-node={position === 'after' ? result?.nextNodeId : undefined}>
    {src ? <div className="demo-video"><video controls playsInline preload="metadata" src={src} onEnded={onContinue} /><button className="demo-secondary" onClick={onContinue}>继续<ArrowRight size={16} /></button></div> : <>
      <div className="demo-film-art"><img src={DEMO_CHARACTER.portrait} alt="裴予迟" /><div className="demo-film-shade" /><span className="demo-film-label"><Film size={14} />{position === 'before' ? '前置剧情视频预留' : '后续剧情节点 · 视频预留'}</span><span className="demo-film-time">深渊与茧 · {position === 'before' ? '会谈中段' : config.nextNode.title}</span></div>
      <div className="demo-film-copy"><p className="demo-eyebrow">{position === 'before' ? '心防崩解 · 互动片段' : `下一剧情节点 · ${config.nextNode.title}`}</p>{position === 'after' && result && <div className="story-node-progress">击破进度 <strong>{result.breakProgress}</strong><span> / {config.breakProgress.maximum}</span></div>}<h1>{title}</h1><p>{position === 'before' ? '裴予迟把视线移向窗外。刚才的玩笑像一道挡在你们之间的门。你需要找到让这场对话继续的方式。' : result?.outcome === 'success' ? result.response === 'press' ? '他终于迎上你的目光，语气里仍带着不甘，却没有再转移话题。' : '他放下手中的杯子，终于愿意把刚才没有说完的话继续下去。' : result?.outcome === 'partial' ? '你触碰到了他的迟疑。他愿意留下，但仍为自己保留了一点距离。' : '他没有准备好继续。下一次开口，也许需要换一种方式。'}</p>
        <button className="demo-primary" onClick={onContinue}>{position === 'before' ? <><Play size={16} />继续会谈</> : <>重新演示<ArrowRight size={16} /></>}</button>
      </div>
    </>}
  </section>;
}
