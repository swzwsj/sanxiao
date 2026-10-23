import type { ClearFeedback } from '../types/game';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private isMuted: boolean = false;
  private bgmInterval: number | null = null;
  private currentBgmPhase: number = 0;
  private isBgmActive: boolean = false;
  private nextNoteTime: number = 0;
  private stepIndex: number = 0;

  constructor() {
    try { this.isMuted = localStorage.getItem('mind_break_sound_muted') === 'true'; } catch { /* Sound still works without storage. */ }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.output = this.ctx.createGain();
        this.output.gain.value = this.isMuted ? 0 : .7;
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -16; limiter.knee.value = 20; limiter.ratio.value = 8;
        limiter.attack.value = .003; limiter.release.value = .16;
        this.output.connect(limiter); limiter.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try { localStorage.setItem('mind_break_sound_muted', String(this.isMuted)); } catch { /* Session preference remains available. */ }
    if (this.ctx && this.output) this.output.gain.setTargetAtTime(this.isMuted ? 0 : .7, this.ctx.currentTime, .02);
    if (this.isMuted) {
      this.stopBgm();
    } else {
      this.startBgm(this.currentBgmPhase);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private tone(frequency: number, offset: number, duration: number, volume: number, wave: OscillatorType = 'sine', endFrequency = frequency) {
    const ctx = this.ctx;
    if (!ctx || !this.output) return;
    const voice = ctx.createOscillator(), envelope = ctx.createGain(), start = ctx.currentTime + offset;
    voice.type = wave; voice.frequency.setValueAtTime(frequency, start);
    voice.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    voice.connect(envelope); envelope.connect(this.output);
    voice.onended = () => { voice.disconnect(); envelope.disconnect(); };
    voice.start(start); voice.stop(start + duration + .01);
  }

  private texture(duration: number, volume: number, frequency: number, highpass = false) {
    const ctx = this.ctx;
    if (!ctx || !this.output) return;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .4), ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
    source.buffer = this.noise; filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.setValueAtTime(frequency, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, frequency * .3), ctx.currentTime + duration);
    envelope.gain.setValueAtTime(volume, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.output);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(); source.stop(ctx.currentTime + duration);
  }

  /** One layered cue per wave; bounded voices, rising chain notes, and a shared limiter. */
  public playClear(feedback: ClearFeedback) {
    if (this.isMuted || document.hidden) return;
    this.initCtx();
    if (!this.ctx) return;
    const scale = [392, 440, 523.25, 587.33, 659.25, 783.99, 880];
    const root = scale[Math.min(scale.length - 1, feedback.chain - 1)];
    this.tone(root, 0, .2, .13);
    this.tone(root * 2.01, .012, .12, .035, 'triangle');
    this.texture(.055, .035, 3000, true);
    if (feedback.kind === 'four') [1.5, 2].forEach((ratio, i) => this.tone(root * ratio, .035 + i * .045, .2, .085, 'triangle'));
    if (feedback.kind === 'five' || feedback.kind === 'long') [1.25, 1.5, 2, 2.5].forEach((ratio, i) => this.tone(root * ratio, .03 + i * .045, .26, .07));
    if (feedback.kind === 'long') { this.tone(100, 0, .3, .1, 'sine', 40); this.tone(root * 3, .19, .26, .045); }
    if (feedback.kind === 'cross') { this.tone(170, 0, .22, .12, 'triangle', 55); this.texture(.12, .09, 1600); }
    if (feedback.chain >= 2) this.tone(root * 1.5, .06, .24, .07);
    const specials = new Set(feedback.activated.map(item => item.special));
    if (specials.has('line_h') || specials.has('line_v')) { this.texture(.14, .085, 2200, true); this.tone(1200, 0, .19, .07, 'sine', 320); }
    if (specials.has('bomb')) { this.tone(135, 0, .32, .18, 'sine', 38); this.texture(.24, .14, 1100); }
    if (specials.has('eye')) [1, 1.25, 1.5, 2].forEach((ratio, i) => this.tone(440 * ratio, i * .045, .25, .065, 'triangle', 660 * ratio));
    if (feedback.extraTurn) this.tone(1568, .16, .22, .05);
  }

  public playGemSelect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.output!);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playGemSwap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.output!);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playPenaltyBuzz() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.setValueAtTime(120, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.output!);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playTimeBonus() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.12);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.output!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * 心理爽感动态连击音效（参考 Mirror/Peggle 机制）：
   * 随着 comboCount 攀升，音调不断跃迁升阶，伴随华丽泛音与晶莹回响，
   * 高连锁时伴随低频重击与泛音琶音，极致刺激心理爽感反馈。
   */
  public playComboAscending(comboCount: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 优雅大调/五声音阶递增序列 (C5 -> D5 -> E5 -> G5 -> A5 -> C6 -> E6 -> G6 -> C7)
    const scale = [
      523.25,  // Combo 1: C5 清脆水晶
      587.33,  // Combo 2: D5 欢快上扬
      659.25,  // Combo 3: E5 泛音闪烁
      783.99,  // Combo 4: G5 激昂共鸣
      880.00,  // Combo 5: A5 心绪破防
      1046.50, // Combo 6: C6 高八度击穿
      1318.51, // Combo 7: E6 极乐琶音
      1567.98, // Combo 8: G6 绝顶高潮
      2093.00, // Combo 9+: C7 支配神明
    ];

    const idx = Math.min(Math.max(0, comboCount - 1), scale.length - 1);
    const mainFreq = scale[idx];

    // 主音发生器 (晶莹正弦波)
    const oscMain = this.ctx.createOscillator();
    const gainMain = this.ctx.createGain();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(mainFreq, now);
    oscMain.frequency.exponentialRampToValueAtTime(mainFreq * 1.03, now + 0.12);

    const baseVol = Math.min(0.24, 0.09 + comboCount * 0.02);
    gainMain.gain.setValueAtTime(baseVol, now);
    gainMain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    oscMain.connect(gainMain);
    gainMain.connect(this.output!);
    oscMain.start(now);
    oscMain.stop(now + 0.29);

    // 和声/泛音层 (三角波增加质感与光泽)
    const oscHarmonic = this.ctx.createOscillator();
    const gainHarmonic = this.ctx.createGain();
    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(mainFreq * 2.0, now);
    oscHarmonic.frequency.exponentialRampToValueAtTime(mainFreq * 2.05, now + 0.1);

    gainHarmonic.gain.setValueAtTime(baseVol * 0.5, now);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    oscHarmonic.connect(gainHarmonic);
    gainHarmonic.connect(this.output!);
    oscHarmonic.start(now);
    oscHarmonic.stop(now + 0.23);

    // 2 连击以上：加入快速上扬的双音琶音 (Grace Note)
    if (comboCount >= 2) {
      const graceOsc = this.ctx.createOscillator();
      const graceGain = this.ctx.createGain();
      const graceTime = now + 0.04;
      const graceFreq = mainFreq * 1.25; // 大三度或纯四度过渡

      graceOsc.type = 'sine';
      graceOsc.frequency.setValueAtTime(graceFreq, graceTime);
      graceOsc.frequency.exponentialRampToValueAtTime(graceFreq * 1.5, graceTime + 0.1);

      graceGain.gain.setValueAtTime(0.08, graceTime);
      graceGain.gain.exponentialRampToValueAtTime(0.001, graceTime + 0.18);

      graceOsc.connect(graceGain);
      graceGain.connect(this.output!);
      graceOsc.start(graceTime);
      graceOsc.stop(graceTime + 0.19);
    }

    // 3 连击以上：增加高频水晶铃铛碎音 (Shimmer Chime)
    if (comboCount >= 3) {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const chimeTime = now + 0.06;

      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(mainFreq * 3.0, chimeTime);
      chimeOsc.frequency.exponentialRampToValueAtTime(mainFreq * 4.0, chimeTime + 0.15);

      chimeGain.gain.setValueAtTime(0.06, chimeTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.2);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.output!);
      chimeOsc.start(chimeTime);
      chimeOsc.stop(chimeTime + 0.21);
    }

    // 5 连击以上极度爽感：深沉低频冲击 (Bass Sub-Thud)
    if (comboCount >= 5) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(140, now);
      bassOsc.frequency.exponentialRampToValueAtTime(42, now + 0.35);

      bassGain.gain.setValueAtTime(0.2, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      bassOsc.connect(bassGain);
      bassGain.connect(this.output!);
      bassOsc.start(now);
      bassOsc.stop(now + 0.41);
    }
  }

  public playGemMatch(combo = 1) {
    this.playComboAscending(combo);
  }

  public playSpecialExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.output!);
    osc.start(now);
    osc.stop(now + 0.4);

    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1200, now);
    chime.frequency.exponentialRampToValueAtTime(2400, now + 0.25);

    chimeGain.gain.setValueAtTime(0.12, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    chime.connect(chimeGain);
    chimeGain.connect(this.output!);
    chime.start(now);
    chime.stop(now + 0.3);
  }

  public playHeartBreak() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    [320, 640, 960, 1280].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.5);

      gain.gain.setValueAtTime(0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.output!);

      osc.start(now + i * 0.04);
      osc.stop(now + 0.6);
    });
  }

  public playSkillCast() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.5);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.output!);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  public playScoreCountTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.output!);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  public playGradeStampSlam(grade: 'S' | 'A' | 'B' | 'C') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Heavy Stamp Impact Thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.output!);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // Fanfare Chimes based on Grade
    const chords: Record<'S' | 'A' | 'B' | 'C', number[]> = {
      S: [523.25, 659.25, 783.99, 1046.5, 1318.5], // C Major triumphant arpeggio
      A: [440.0, 554.37, 659.25, 880.0],          // A Major high cheer
      B: [349.23, 440.0, 523.25],                  // F Major calm resolution
      C: [261.63, 329.63, 392.0],                  // C Major basic resolution
    };

    const notes = chords[grade] || chords.B;
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.06;

      osc.type = grade === 'S' || grade === 'A' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + 0.35);

      gain.gain.setValueAtTime(grade === 'S' ? 0.14 : 0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.output!);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  // ==========================================
  // DYNAMIC MULTI-PHASE BGM ENGINE
  // Phase 0: 78 BPM - Cool Neo-Noir Lounge Clinic
  // Phase 1: 105 BPM - Oppressive Tension & Heart Tremor
  // Phase 2: 128 BPM - Warped Distortion Abyss Climax
  // ==========================================

  public startBgm(phase: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.currentBgmPhase = phase;
    this.isBgmActive = true;

    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }

    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.stepIndex = 0;

    // Scheduler tick every 40ms to keep audio ahead of time
    this.bgmInterval = window.setInterval(() => {
      this.scheduleBgm();
    }, 40);
  }

  public updateBgmPhase(phase: number) {
    if (this.currentBgmPhase === phase) return;
    this.currentBgmPhase = phase;
    // When phase increases to Phase 2, reset step alignment for instant energetic impact
    if (phase === 2 && this.ctx) {
      this.stepIndex = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.02;
    }
  }

  public stopBgm() {
    this.isBgmActive = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  private scheduleBgm() {
    if (!this.isBgmActive || this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Look ahead 0.12s
    while (this.nextNoteTime < now + 0.12) {
      this.playBgmStep(this.nextNoteTime, this.currentBgmPhase, this.stepIndex);

      // Step duration in seconds (16th notes):
      // Phase 0 (78 BPM) -> 60 / (78 * 4) = 0.192s
      // Phase 1 (105 BPM) -> 60 / (105 * 4) = 0.143s
      // Phase 2 (128 BPM) -> 60 / (128 * 4) = 0.117s
      const stepDuration =
        this.currentBgmPhase === 2 ? 0.117 : this.currentBgmPhase === 1 ? 0.143 : 0.192;

      this.nextNoteTime += stepDuration;
      this.stepIndex = (this.stepIndex + 1) % 16;
    }
  }

  private playBgmStep(time: number, phase: number, step: number) {
    if (!this.ctx) return;

    // -------------------------------------------------------------
    // PHASE 0: 清爽高雅诊室 (78 BPM - Cool Neo-Noir Lounge)
    // -------------------------------------------------------------
    if (phase === 0) {
      // Sub Bass pulse on step 0 and 8
      if (step === 0 || step === 8) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(step === 0 ? 73.42 : 55.0, time); // D2 or A1

        bassGain.gain.setValueAtTime(0.045, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        bassOsc.connect(bassGain);
        bassGain.connect(this.output!);
        bassOsc.start(time);
        bassOsc.stop(time + 0.36);
      }

      // Soft Neo-Noir electric piano / pad chords on step 0 and 6
      if (step === 0 || step === 6) {
        const chordNotes = step === 0 ? [293.66, 349.23, 440.0, 523.25] : [329.63, 392.0, 493.88]; // Dm7 or Em7
        chordNotes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.012 - idx * 0.002, time);
          gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.45);

          osc.connect(gain);
          gain.connect(this.output!);
          osc.start(time);
          osc.stop(time + 0.46);
        });
      }

      // Crisp gentle hi-hat on steps 4, 12
      if (step === 4 || step === 12) {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'triangle';
        hatOsc.frequency.setValueAtTime(4200, time);
        hatOsc.frequency.exponentialRampToValueAtTime(1200, time + 0.02);

        hatGain.gain.setValueAtTime(0.015, time);
        hatGain.gain.exponentialRampToValueAtTime(0.0005, time + 0.02);

        hatOsc.connect(hatGain);
        hatGain.connect(this.output!);
        hatOsc.start(time);
        hatOsc.stop(time + 0.02);
      }
    }

    // -------------------------------------------------------------
    // PHASE 1: 光线变暗·心防动摇·心跳加速 (105 BPM - Oppressive Tension)
    // -------------------------------------------------------------
    else if (phase === 1) {
      // Heartbeat Sub-Kick every 4 steps (0, 4, 8, 12)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(110, time);
        kickOsc.frequency.exponentialRampToValueAtTime(38, time + 0.16);

        kickGain.gain.setValueAtTime(0.065, time);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        kickOsc.connect(kickGain);
        kickGain.connect(this.output!);
        kickOsc.start(time);
        kickOsc.stop(time + 0.18);
      }

      // Tense bass saw pulse on off-beats (step 2, 6, 10, 14)
      if (step % 4 === 2) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        const bassFreq = step === 2 ? 65.41 : step === 6 ? 55.0 : step === 10 ? 58.27 : 73.42; // C2, A1, Bb1, D2
        bassOsc.frequency.setValueAtTime(bassFreq, time);

        bassGain.gain.setValueAtTime(0.03, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        bassOsc.connect(bassGain);
        bassGain.connect(this.output!);
        bassOsc.start(time);
        bassOsc.stop(time + 0.13);
      }

      // Eerie Suspense Drone Dissonance on step 0 and 8
      if (step === 0 || step === 8) {
        [220.0, 233.08].forEach(freq => { // A3 + Bb3 minor second tension
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.015, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

          osc.connect(gain);
          gain.connect(this.output!);
          osc.start(time);
          osc.stop(time + 0.46);
        });
      }
    }

    // -------------------------------------------------------------
    // PHASE 2: 扭曲深渊·彻底臣服·极乐崩解 (128 BPM - Warped Abyss Climax)
    // -------------------------------------------------------------
    else if (phase >= 2) {
      // Four-on-the-Floor Heavy Driving Kick (0, 4, 8, 12)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.14);

        kickGain.gain.setValueAtTime(0.075, time);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        kickOsc.connect(kickGain);
        kickGain.connect(this.output!);
        kickOsc.start(time);
        kickOsc.stop(time + 0.15);
      }

      // Fast Arpeggiated Cyber Synth (Every 16th step)
      const arpHexScale = [293.66, 349.23, 440.0, 523.25, 587.33, 698.46, 880.0, 587.33];
      const arpFreq = arpHexScale[step % arpHexScale.length];

      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpFreq, time);

      arpGain.gain.setValueAtTime(0.018, time);
      arpGain.gain.exponentialRampToValueAtTime(0.0005, time + 0.08);

      arpOsc.connect(arpGain);
      arpGain.connect(this.output!);
      arpOsc.start(time);
      arpOsc.stop(time + 0.08);

      // Heavy Reese Saw Bass on steps 0, 4, 8, 12
      if (step % 4 === 0) {
        const reeseOsc = this.ctx.createOscillator();
        const reeseGain = this.ctx.createGain();
        reeseOsc.type = 'sawtooth';
        reeseOsc.frequency.setValueAtTime(73.42, time); // D2

        reeseGain.gain.setValueAtTime(0.035, time);
        reeseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        reeseOsc.connect(reeseGain);
        reeseGain.connect(this.output!);
        reeseOsc.start(time);
        reeseOsc.stop(time + 0.23);
      }
    }
  }
}

export const soundManager = new SoundManager();
