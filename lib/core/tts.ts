/**
 * Jamie's TTS (Text-to-Speech) Utility
 * Provides a synthetic voice for HUD observations.
 */

export const speak = (text: string, voiceName: string = 'Jamie') => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a good "Intelligence Operative" voice
  const voices = window.speechSynthesis.getVoices();
  
  // Preference: UK English Male or US English Male for tactical feel
  const preferredVoice = voices.find(v => v.name.includes('Google UK English Male')) || 
                         voices.find(v => v.name.includes('Google US English Male')) ||
                         voices.find(v => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.pitch = 0.85; // Slightly lower pitch for tactical feel
  utterance.rate = 1.1;   // Slightly faster
  utterance.volume = 0.8;

  window.speechSynthesis.speak(utterance);
};
