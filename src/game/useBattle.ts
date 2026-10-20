import { useEffect, useSyncExternalStore } from 'react';
import { BattleController } from './BattleController';

export function useBattle(controller: BattleController) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    if (state.status !== 'playing' || state.paused) return;
    let previous = performance.now();
    const tick = () => {
      const now = performance.now();
      if (!document.hidden) controller.advanceTime(now - previous);
      previous = now;
    };
    const visible = () => { previous = performance.now(); };
    const id = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', visible); };
  }, [controller, state.status, state.paused]);
  return state;
}
