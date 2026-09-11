// Web Audio API emergency panic siren synthesizer

class EmergencySiren {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private isPlaying: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public start() {
    if (this.isPlaying) return;

    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Master Gain - set to maximum volume
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.85, now);
      this.gainNode.connect(this.ctx.destination);

      // Primary Siren Oscillator (High pitch sweep)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(750, now);

      // Secondary Siren Oscillator (Harmonic richness)
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'square';
      this.osc2.frequency.setValueAtTime(950, now);

      // Modulation LFO (Low Frequency Oscillator) to create the cycling siren wail
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'triangle';
      this.lfo.frequency.setValueAtTime(1.8, now); // ~1.8 Hz cycle

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(350, now); // Swing +/- 350 Hz

      // Connect LFO to pitch
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc1.frequency);
      this.lfoGain.connect(this.osc2.frequency);

      // Dual oscillator through filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);

      this.osc1.connect(filter);
      this.osc2.connect(filter);
      filter.connect(this.gainNode);

      this.osc1.start(now);
      this.osc2.start(now);
      this.lfo.start(now);

      this.isPlaying = true;
    } catch (e) {
      console.warn('Audio playback error (user interaction might be needed):', e);
    }
  }

  public stop() {
    if (!this.isPlaying) return;

    try {
      if (this.gainNode && this.ctx) {
        // Quick 50ms fade out to avoid clicks
        const now = this.ctx.currentTime;
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      }

      setTimeout(() => {
        try {
          this.osc1?.stop();
          this.osc2?.stop();
          this.lfo?.stop();
          this.osc1?.disconnect();
          this.osc2?.disconnect();
          this.lfo?.disconnect();
        } catch {
          // ignore
        }
        this.osc1 = null;
        this.osc2 = null;
        this.lfo = null;
        this.isPlaying = false;
      }, 60);
    } catch {
      this.isPlaying = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public playBriefAlert(durationMs: number = 800) {
    if (this.isPlaying) return;
    this.start();
    setTimeout(() => {
      this.stop();
    }, durationMs);
  }
}

export const siren = new EmergencySiren();

// Speech Synthesis for Theft Audio Warning: "هذا الهاتف مسروق، أعده لصاحبه فوراً!"
let voiceLoopInterval: NodeJS.Timeout | null = null;

export function speakTheftWarning(lang: string = 'ar') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Cancel any existing utterance
  window.speechSynthesis.cancel();

  const speakOnce = () => {
    try {
      const message =
        lang === 'ar'
          ? 'تحذير أمني! هذا الهاتف مسروق، أعده لصاحبه فوراً. تم التقاط صورتك وتحديد موقعك بدقة.'
          : 'Security Warning! This phone is stolen, return it to its owner immediately. Your photo and GPS location have been transmitted.';

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Select Arabic or English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) =>
        lang === 'ar' ? v.lang.startsWith('ar') : v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Voice warning error:', e);
    }
  };

  speakOnce();

  // Repeat warning every 7 seconds while alarm is active
  if (voiceLoopInterval) clearInterval(voiceLoopInterval);
  voiceLoopInterval = setInterval(() => {
    if (window.speechSynthesis && !window.speechSynthesis.speaking) {
      speakOnce();
    }
  }, 7000);
}

export function stopTheftWarning() {
  if (voiceLoopInterval) {
    clearInterval(voiceLoopInterval);
    voiceLoopInterval = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
