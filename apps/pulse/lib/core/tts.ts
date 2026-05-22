/**
 * Jamie's TTS (Text-to-Speech) Utility
 * Provides a synthetic voice for HUD observations.
 */

export const speak = (text: string, voiceName: string = 'Jamie') => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Global Mute Check
  const voiceEnabled = localStorage.getItem('jamie_voice_enabled') !== 'false';
  if (!voiceEnabled) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a good "Intelligence Operative" voice
  const voices = window.speechSynthesis.getVoices();
  
  let preferredVoice;
  
  if (voiceName === 'Jamie') {
    preferredVoice = voices.find(v => v.name.includes('Google UK English Male')) || 
                     voices.find(v => v.name.includes('Male')) ||
                     voices.find(v => v.lang.startsWith('en-GB'));
  } else if (voiceName === 'Spike') {
    preferredVoice = voices.find(v => v.name.includes('Google US English Male')) || 
                     voices.find(v => v.name.includes('Male')) ||
                     voices.find(v => v.lang.startsWith('en-US'));
  } else if (voiceName === 'Ghost') {
    preferredVoice = voices.find(v => v.name.includes('Female')) || 
                     voices.find(v => v.lang.startsWith('en-AU'));
  } else {
    // Custom/Cloned voices fallback
    preferredVoice = voices.find(v => v.lang.startsWith('en'));
  }

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Adjust characteristics based on persona
  if (voiceName === 'Spike') {
    utterance.pitch = 1.1;
    utterance.rate = 1.2;
  } else if (voiceName === 'Ghost') {
    utterance.pitch = 0.7;
    utterance.rate = 0.9;
  } else {
    utterance.pitch = 0.85; // Default Jamie tactical feel
    utterance.rate = 1.1;
  }

  utterance.volume = 0.8;

  window.speechSynthesis.speak(utterance);
};
