// Procedural Web Audio API Sound & Music Synthesizer for VOLTAGE SURGE
// Generates dramatic cinematic soundtracks, dynamic tension arpeggios, electric hums,
// spark crackles, sub-bass drops, and grand orchestral victory fanfares without external audio files.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Continuous ambient hum & sub-bass nodes
    this.humOsc1 = null;
    this.humOsc2 = null;
    this.humFilter = null;
    this.humGain = null;
    this.masterGain = null;

    // Dramatic tension soundtrack sequencer
    this.musicInterval = null;
    this.musicStep = 0;
    this.currentBpm = 126;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Continuous Reactor Hum (Dual Oscillator with Lowpass Filter)
      this.humOsc1 = this.ctx.createOscillator();
      this.humOsc1.type = 'sawtooth';
      this.humOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz Low A

      this.humOsc2 = this.ctx.createOscillator();
      this.humOsc2.type = 'triangle';
      this.humOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

      this.humFilter = this.ctx.createBiquadFilter();
      this.humFilter.type = 'lowpass';
      this.humFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.humFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.humGain = this.ctx.createGain();
      this.humGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Silent in standby mode

      this.humOsc1.connect(this.humFilter);
      this.humOsc2.connect(this.humFilter);
      this.humFilter.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOsc1.start();
      this.humOsc2.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed or blocked:', e);
    }
  }

  ensureRunning() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // ====================================================
  // 1. DYNAMIC VOLTAGE HUM & RHYTHMIC MUSIC PROGRESSION
  // ====================================================
  updateVoltageHum(voltage, isPlaying = true) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    if (!isPlaying) {
      this.stopDramaticTrack();
      if (this.humGain && this.ctx) {
        this.humGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (!this.musicInterval) {
      this.startDramaticTrack();
    }

    const norm = Math.min(1, Math.max(0, voltage / 100));
    
    // Frequency rises from 55Hz to 180Hz as voltage rises
    const baseFreq = 55 + (norm * 125);
    this.humOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);
    this.humOsc2.frequency.setTargetAtTime(baseFreq * 2.01, this.ctx.currentTime, 0.08);

    // Filter opens up from 120Hz to 3200Hz revealing energetic high-voltage harmonics
    const filterFreq = 120 + Math.pow(norm, 1.7) * 3000;
    this.humFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);

    // Volume intensifies dynamically
    const humVol = 0.04 + (norm * 0.16);
    this.humGain.gain.setTargetAtTime(humVol, this.ctx.currentTime, 0.08);
  }

  // Start procedural pulse-pounding synthwave soundtrack (Locked to global beat grid for 100% sync across all devices)
  startDramaticTrack() {
    if (!this.ctx || this.isMuted) return;

    // Clear any previous running timers first to prevent compounding
    this.stopDramaticTrack();

    const bassNotes = [110, 110, 130.81, 110, 146.83, 130.81, 164.81, 146.83]; // A minor driving arpeggio
    const leadNotes = [440, 523.25, 587.33, 659.25, 880, 783.99, 659.25, 587.33];
    const STEP_MS = 238; // 126 BPM 8th-note duration (238ms per step, 1904ms per 8-step measure)

    const playNoteAtStep = (globalStep) => {
      if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
      const t = this.ctx.currentTime;
      const step = ((globalStep % 8) + 8) % 8;

      // 1. Driving Sub/Mid Bass Pulse
      const bassFreq = bassNotes[step];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      const bassFilter = this.ctx.createBiquadFilter();

      bassOsc.type = step % 2 === 0 ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, t);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(450 + (step * 80), t);
      bassFilter.Q.setValueAtTime(3.0, t);

      bassGain.gain.setValueAtTime(0.18, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.masterGain);

      bassOsc.start(t);
      bassOsc.stop(t + 0.18);

      // 2. High-Tech Synth Arpeggio Layer (On alternate beats)
      if (step % 2 === 1) {
        const leadFreq = leadNotes[step];
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        leadOsc.frequency.setValueAtTime(leadFreq, t);

        leadGain.gain.setValueAtTime(0.08, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        leadOsc.connect(leadGain);
        leadGain.connect(this.masterGain);

        leadOsc.start(t);
        leadOsc.stop(t + 0.14);
      }
    };

    const tick = () => {
      const now = Date.now();
      const globalStep = Math.floor(now / STEP_MS);
      playNoteAtStep(globalStep);
    };

    // Align with global network clock timestamp grid so all joining phones lock in phase
    const now = Date.now();
    const msToNextBeat = Math.max(5, STEP_MS - (now % STEP_MS));

    this.musicTimeout = setTimeout(() => {
      tick();
      this.musicInterval = setInterval(tick, STEP_MS);
    }, msToNextBeat);
  }

  stopDramaticTrack() {
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicStep = 0;
    this.currentBpm = 126;
  }

  resetAudio() {
    this.stopDramaticTrack();
    this.currentBpm = 126;
    this.musicStep = 0;
    if (this.humGain && this.ctx) {
      this.humGain.gain.setTargetAtTime(0.02, this.ctx.currentTime, 0.1);
    }
    if (this.humFilter && this.ctx) {
      this.humFilter.frequency.setTargetAtTime(100, this.ctx.currentTime, 0.1);
    }
    if (this.humOsc1 && this.ctx) {
      this.humOsc1.frequency.setTargetAtTime(55, this.ctx.currentTime, 0.1);
    }
    if (this.humOsc2 && this.ctx) {
      this.humOsc2.frequency.setTargetAtTime(110, this.ctx.currentTime, 0.1);
    }
  }

  // ====================================================
  // 2. SOUND EFFECTS (SHAKE ZAPS, BOOSTS, ALARMS, COUNTDOWN)
  // ====================================================
  playCountdownBeep(count) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    if (count === 'LAUNCH!' || count === 0) {
      this.playGameStart();
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    const freq = count === 1 ? 920 : (count === 2 ? 680 : 520);
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  playShakeZap(intensity = 1.0) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // 1. High-Tech Electrical Arc Zap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const startFreq = 420 + Math.random() * 850 * intensity;
    const endFreq = 90 + Math.random() * 120;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.09);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1300 + Math.random() * 1000, t);
    filter.Q.setValueAtTime(4.0, t);

    const zapVol = Math.min(0.32, 0.11 * intensity);
    gain.gain.setValueAtTime(zapVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);

    // 2. Punchy Sub-Bass Physical Impulse (Acoustic Haptic rumble through phone speaker)
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(130, t);
    kickOsc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    kickGain.gain.setValueAtTime(0.38, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    kickOsc.connect(kickGain);
    kickGain.connect(this.masterGain);

    kickOsc.start(t);
    kickOsc.stop(t + 0.09);
  }

  playBoostSurge() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Sub Bass Thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(150, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.45);

    subGain.gain.setValueAtTime(0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.6);

    // Rising Energy Sweep
    const sweepOsc = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(180, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(1800, t + 0.38);

    sweepGain.gain.setValueAtTime(0.32, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    sweepOsc.connect(sweepGain);
    sweepGain.connect(this.masterGain);
    sweepOsc.start(t);
    sweepOsc.stop(t + 0.45);
  }

  playMultiplierUp(mult = 2) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    const baseFreq = notes[Math.min(notes.length - 1, mult - 1)] || 660;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playGameStart() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Siren / Rising Power Sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.6);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(4200, t + 0.6);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.75);

    this.startDramaticTrack();
  }

  // ====================================================
  // 3. EPIC MAJESTIC ORCHESTRAL VICTORY SYMPHONY
  // ====================================================
  playVictory() {
    this.stopDramaticTrack();
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // PHASE 1: MASSIVE SUB-BASS EARTHQUAKE IMPACT
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 1.2);
    subGain.gain.setValueAtTime(0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 1.5);

    // PHASE 2: GLORIOUS BRASS & SYNTH POWER CHORD FANFARE PROGRESSION
    const chordProgression = [
      { delay: 0.05, duration: 0.45, freqs: [261.63, 329.63, 392.00, 523.25], vol: 0.35 }, // C Major
      { delay: 0.45, duration: 0.45, freqs: [349.23, 440.00, 523.25, 698.46], vol: 0.38 }, // F Major
      { delay: 0.85, duration: 0.45, freqs: [392.00, 493.88, 587.33, 783.99], vol: 0.40 }, // G Major
      { delay: 1.25, duration: 0.55, freqs: [440.00, 523.25, 659.25, 880.00], vol: 0.42 }, // A Minor
      { delay: 1.75, duration: 4.50, freqs: [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98], vol: 0.50 } // GRAND HIGH C OVERDRIVE
    ];

    chordProgression.forEach(({ delay, duration, freqs, vol }) => {
      const chordStart = now + delay;
      freqs.forEach((freq) => {
        // Primary Sawtooth Layer
        const sawOsc = this.ctx.createOscillator();
        const sawGain = this.ctx.createGain();
        const sawFilter = this.ctx.createBiquadFilter();

        sawOsc.type = 'sawtooth';
        sawOsc.frequency.setValueAtTime(freq, chordStart);
        sawOsc.frequency.setValueAtTime(freq * 1.002, chordStart + 0.1); // subtle chorus detune

        sawFilter.type = 'lowpass';
        sawFilter.frequency.setValueAtTime(2400, chordStart);
        sawFilter.Q.setValueAtTime(2.5, chordStart);

        const individualVol = vol / Math.sqrt(freqs.length);
        sawGain.gain.setValueAtTime(individualVol, chordStart);
        sawGain.gain.exponentialRampToValueAtTime(0.001, chordStart + duration);

        sawOsc.connect(sawFilter);
        sawFilter.connect(sawGain);
        sawGain.connect(this.masterGain);

        sawOsc.start(chordStart);
        sawOsc.stop(chordStart + duration + 0.1);

        // Secondary Warm Triangle Layer for Body
        const triOsc = this.ctx.createOscillator();
        const triGain = this.ctx.createGain();
        triOsc.type = 'triangle';
        triOsc.frequency.setValueAtTime(freq / 2, chordStart); // Octave below

        triGain.gain.setValueAtTime(individualVol * 0.7, chordStart);
        triGain.gain.exponentialRampToValueAtTime(0.001, chordStart + duration);

        triOsc.connect(triGain);
        triGain.connect(this.masterGain);

        triOsc.start(chordStart);
        triOsc.stop(chordStart + duration + 0.1);
      });
    });

    // PHASE 3: CRYSTALLINE SPARKLE CHIMES CASCADE (1.8s -> 4.5s)
    const sparkleNotes = [1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00, 2349.32, 2637.02];
    sparkleNotes.forEach((pitch, idx) => {
      const chimeTime = now + 1.85 + (idx * 0.09);
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(pitch, chimeTime);

      chimeGain.gain.setValueAtTime(0.12, chimeTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 0.5);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      chimeOsc.start(chimeTime);
      chimeOsc.stop(chimeTime + 0.55);
    });

    // PHASE 4: WARM SUSTAINED AMBIENT CELEBRATORY PAD (2.2s -> 6.5s)
    const padFreqs = [130.81, 196.00, 261.63, 329.63, 392.00];
    padFreqs.forEach((freq) => {
      const padOsc = this.ctx.createOscillator();
      const padGain = this.ctx.createGain();
      const padFilter = this.ctx.createBiquadFilter();

      padOsc.type = 'sine';
      padOsc.frequency.setValueAtTime(freq, now + 2.0);

      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(800, now + 2.0);

      padGain.gain.setValueAtTime(0.001, now + 2.0);
      padGain.gain.exponentialRampToValueAtTime(0.14, now + 2.8);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 6.8);

      padOsc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.masterGain);

      padOsc.start(now + 2.0);
      padOsc.stop(now + 7.0);
    });
  }

  playGameOver() {
    this.stopDramaticTrack();
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.3);
  }
}

export const audioEngine = new AudioEngine();
