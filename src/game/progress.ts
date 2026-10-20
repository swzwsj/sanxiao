import type { DemoConfig } from '../types/demo';

/** This encounter awards progress once. The film owns accumulation across distinct nodes. */
export function encounterProgress(config: DemoConfig, success: boolean) {
  const maximum = Math.max(1, Math.floor(config.breakProgress.maximum));
  const progressBefore = Math.max(0, Math.min(maximum, Math.floor(config.breakProgress.initial)));
  const gain = success ? Math.max(0, Math.floor(config.breakProgress.successGain)) : 0;
  const breakProgress = Math.min(maximum, progressBefore + gain);
  return { progressBefore, progressDelta: breakProgress - progressBefore, breakProgress };
}
