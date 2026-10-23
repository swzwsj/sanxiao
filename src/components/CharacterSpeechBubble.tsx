import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { ArrowRight, MessageCircle, Pause, Play, RotateCcw } from 'lucide-react';
import type { BattleStory } from '../types/demo';
import './CharacterSpeechBubble.css';

export interface CharacterSpeechHandle { interact: () => void; }
interface Props {
  story: BattleStory;
  speaker: string;
  active: boolean;
  automatic: boolean;
  onToggleAutomatic: () => void;
  onNextStory: (id: number, lineIndex: number) => void;
  onReplayStory: (id: number) => void;
}

/** Typing, portrait clicks and automatic playback share one cursor without stealing board focus. */
export const CharacterSpeechBubble = forwardRef<CharacterSpeechHandle, Props>(function CharacterSpeechBubble({ story, speaker, active, automatic, onToggleAutomatic, onNextStory, onReplayStory }, ref) {
  const line = story.lines[story.lineIndex];
  const letters = useMemo(() => Array.from(line.text), [line.text]);
  const lineKey = `${story.id}:${story.lineIndex}`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [typing, setTyping] = useState({ key: lineKey, count: reducedMotion ? letters.length : 0 });
  const visible = typing.key === lineKey ? typing.count : reducedMotion ? letters.length : 0;
  const full = visible >= letters.length;
  const last = story.lineIndex === story.lines.length - 1;

  useEffect(() => {
    if (full || !active) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    const schedule = () => {
      clearInterval(timer);
      if (media.matches) { setTyping({ key: lineKey, count: letters.length }); return; }
      if (!document.hidden) timer = window.setInterval(() => setTyping(current => ({ key: lineKey, count: Math.min(letters.length, (current.key === lineKey ? current.count : 0) + 1) })), 26);
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    media.addEventListener('change', schedule);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', schedule); media.removeEventListener('change', schedule); };
  }, [full, active, letters.length, lineKey]);

  useEffect(() => {
    if (!full || !active || !automatic || last) return;
    let timer = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = window.setTimeout(() => onNextStory(story.id, story.lineIndex), 3800);
    };
    schedule(); document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [full, active, automatic, last, story.id, story.lineIndex, onNextStory]);

  const interact = useCallback(() => {
    if (!active) return;
    if (!full) { setTyping({ key: lineKey, count: letters.length }); return; }
    if (last) onReplayStory(story.id);
    else onNextStory(story.id, story.lineIndex);
  }, [active, full, last, letters.length, lineKey, story.id, story.lineIndex, onNextStory, onReplayStory]);
  useImperativeHandle(ref, () => ({ interact }), [interact]);
  const action = !full ? '显示全文' : last ? '回看本段' : '下一句';

  return <div className={`character-speech ${line.speaker === 'heroine' ? 'character-speech-heroine' : ''}`} data-testid="battle-story" data-beat={story.id} data-line={story.lineIndex} data-complete={full} data-speaker={line.speaker} role="region" aria-label="战斗剧情">
    <div className="character-speech-heading"><strong><MessageCircle size={15} aria-hidden="true" />{speaker}</strong><span>{story.lineIndex + 1}<i> / {story.lines.length}</i></span></div>
    <button type="button" className="character-speech-text" onClick={interact} disabled={!active} aria-label={!full ? '显示完整台词' : last ? '回看本段台词' : '推进台词'}>
      <span aria-hidden="true">{letters.slice(0, visible).join('')}<i className={`character-speech-cursor ${full ? 'is-finished' : ''}`} /></span>
      <span className="sr-only" aria-live="polite">{line.text}</span>
    </button>
    <div className="character-speech-controls">
      <button type="button" className="character-speech-auto" onClick={onToggleAutomatic} disabled={!active} aria-label={automatic ? '关闭台词自动播放' : '开启台词自动播放'} aria-pressed={automatic}>{automatic ? <Pause size={12} /> : <Play size={12} />}{automatic ? '自动播放' : '手动播放'}</button>
      <button type="button" className="character-speech-next" onClick={interact} disabled={!active} aria-label={!full ? '显示当前完整台词' : `${action}台词`}>{action}{full && last ? <RotateCcw size={14} /> : <ArrowRight size={14} />}</button>
    </div>
  </div>;
});
