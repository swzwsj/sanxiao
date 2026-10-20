import type { BattleResult } from '../types/demo';

/**
 * Embed: /?embed=1&approach=patient&parentOrigin=https%3A%2F%2Fyour-film.example
 * Record xinfang:complete; wait for xinfang:continue before replacing the iframe,
 * so the player can see the +20 reward before the next film scene.
 * Check event.origin and event.source against your iframe. No wildcard target origins.
 * A standalone host can listen for the same named CustomEvent on window.
 */
export function filmEvent(type: 'xinfang:ready' | 'xinfang:complete' | 'xinfang:continue', payload: BattleResult | { battleId: string }) {
  window.dispatchEvent(new CustomEvent(type, { detail: payload }));
  if (window.parent === window) return;
  const value = new URLSearchParams(window.location.search).get('parentOrigin');
  let origin = window.location.origin;
  if (value) {
    try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) return; origin = url.origin; }
    catch { return; }
  }
  window.parent.postMessage({ type, payload }, origin);
}
