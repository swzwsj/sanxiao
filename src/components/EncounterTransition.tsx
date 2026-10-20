import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface EncounterFrame { element: HTMLElement; width: number; scrollY: number; }
export function captureEncounterFrame(root: HTMLElement): EncounterFrame {
  const element = root.cloneNode(true) as HTMLElement;
  element.removeAttribute('inert');
  element.removeAttribute('data-app-root');
  for (const el of [element, ...element.querySelectorAll<HTMLElement>('[id], [data-testid], [data-film-slot], [data-story-node]')]) {
    for (const attr of ['id', 'data-testid', 'data-film-slot', 'data-story-node']) el.removeAttribute(attr);
  }
  return { element, width: root.getBoundingClientRect().width, scrollY: window.scrollY };
}

export function EncounterTransition({ frame, onComplete }: { frame: EncounterFrame; onComplete: () => void }) {
  const left = useRef<HTMLDivElement>(null), right = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useLayoutEffect(() => {
    for (const panel of [left.current, right.current]) {
      if (!panel) continue;
      const copy = frame.element.cloneNode(true) as HTMLElement;
      Object.assign(copy.style, { width: `${frame.width}px`, position: 'absolute', top: `${-frame.scrollY}px`, left: '0', margin: '0' });
      panel.replaceChildren(copy);
    }
  }, [frame]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => complete.current(), reduced ? 180 : 1250);
    return () => { clearTimeout(timer); document.body.style.overflow = previous; };
  }, []);
  return createPortal(<div className="encounter-transition" data-testid="encounter-transition" role="status" aria-label="心防交锋开始">
    <div className="encounter-snapshots" aria-hidden="true" inert>
      <div ref={left} className="encounter-half encounter-left" />
      <div ref={right} className="encounter-half encounter-right" />
    </div>
    <div className="encounter-flash" aria-hidden="true" />
    <div className="encounter-seam" aria-hidden="true" />
    <div className="encounter-caption" aria-hidden="true"><span>裴予迟 · 对峙开始</span><strong>心防交锋</strong><i /></div>
  </div>, document.body);
}
