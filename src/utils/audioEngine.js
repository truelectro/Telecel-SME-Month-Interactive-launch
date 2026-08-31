// Procedural Web Audio API Sound Synthesizer for VOLTAGE SURGE
// Generates electric hums, spark crackles, boost surges, sirens, and fanfares without external audio files.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Continuous ambient hum nodes
    this.humOsc1 = null;
    this.humOsc2 = null;
    this.humFilter = null;
    this.humGain = null;
    this.masterGain = null;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
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
      this.humGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

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
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // Update dynamic background reactor hum based on live voltage (0 - 100)
  updateVoltageHum(voltage, isPlaying = true) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    if (!isPlaying || voltage <= 0) {
      this.humGain.gain.setTargetAtTime(0.02, this.ctx.currentTime, 0.1);
      this.humFilter.frequency.setTargetAtTime(100, this.ctx.currentTime, 0.1);
      return;
    }

    const norm = Math.min(1, Math.max(0, voltage / 100));
    
    // Frequency rises from 55Hz to 165Hz as voltage rises
    const baseFreq = 55 + (norm * 110);
    this.humOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);
    this.humOsc2.frequency.setTargetAtTime(baseFreq * 2.01, this.ctx.currentTime, 0.08);

    // Filter opens up from 120Hz to 2800Hz revealing high-frequency electric crackle
    const filterFreq = 120 + Math.pow(norm, 1.8) * 2600;
    this.humFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);

    // Volume intensifies slightly
    const humVol = 0.05 + (norm * 0.18);
    this.humGain.gain.setTargetAtTime(humVol, this.ctx.currentTime, 0.08);
  }

  // High-frequency electric spark / zap when players shake
  playShakeZap(intensity = 1.0) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    // Randomized pitch for realistic electric arc crackle
    const startFreq = 400 + Math.random() * 800 * intensity;
    const endFreq = 80 + Math.random() * 120;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.09);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + Math.random() * 1000, t);
    filter.Q.setValueAtTime(4.0, t);

    const zapVol = Math.min(0.35, 0.12 * intensity);
    gain.gain.setValueAtTime(zapVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Dramatic sub-bass explosion & high-energy electric burst for BOOST
  playBoostSurge() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Sub Bass Thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    subGain.gain.setValueAtTime(0.6, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.55);

    // 2. Rising Energy Sweep
    const sweepOsc = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(200, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(1600, t + 0.35);

    sweepGain.gain.setValueAtTime(0.3, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    sweepOsc.connect(sweepGain);
    sweepGain.connect(this.masterGain);
    sweepOsc.start(t);
    sweepOsc.stop(t + 0.45);
  }

  // Multiplier level up chime
  playMultiplierUp(mult = 2) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major arpeggio
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

  // Triumphant Victory Fanfare
  playVictory() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const chords = [
      [523.25, 659.25, 783.99], // C Major
      [587.33, 739.99, 880.00], // D Major
      [659.25, 830.61, 987.77], // E Major
      [1046.50, 1318.51, 1567.98] // High C Power Chord
    ];

    chords.forEach((chord, step) => {
      const startTime = this.ctx.currentTime + (step * 0.22);
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    });
  }

  // Power shut down for Game Over
  playGameOver() {
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
