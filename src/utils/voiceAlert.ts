/**
 * Anti-Theft Voice Warning Synthesizer (Web Speech API)
 * Speaks loudly: "هذا الهاتف مسروق، أعده لصاحبه فوراً!" / "Warning! This phone is reported stolen!"
 */

class VoiceWarningManager {
  private isSpeaking: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;

  public start(lang: string = 'ar') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    this.stop();
    this.isSpeaking = true;

    // Speak immediately
    this.speakMessage(lang);

    // Repeat every 7 seconds while lockdown is active
    this.loopInterval = setInterval(() => {
      if (this.isSpeaking) {
        this.speakMessage(lang);
      }
    }, 7000);
  }

  public stop() {
    this.isSpeaking = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private speakMessage(lang: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Clear any queued utterances
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const isAr = lang === 'ar';
      const text = isAr
        ? 'تحذير أمني! هذا الهاتف مسروق، أعده لصاحبه فوراً! تم تحديد موقعك وتصويرك.'
        : 'Security alert! This phone is reported stolen! Return it to its owner immediately!';

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1.0; // Maximum volume
      utterance.rate = 0.92; // Clear authoritative pace
      utterance.pitch = 1.0;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (isAr) {
        utterance.lang = 'ar-SA';
        const arVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
        if (arVoice) utterance.voice = arVoice;
      } else {
        utterance.lang = 'en-US';
        const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[VoiceAlert] Speech synthesis notice:', err);
    }
  }
}

export const voiceAlert = new VoiceWarningManager();
