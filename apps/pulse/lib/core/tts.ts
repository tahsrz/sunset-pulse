/**
 * Browser text-to-speech with stable persona presets and playback lifecycle events.
 */

export const TTS_START_EVENT = 'jamie:tts-start';
export const TTS_END_EVENT = 'jamie:tts-end';

type VoicePreset = {
  pitch: number;
  rate: number;
  language: string;
  preferredNames: string[];
};

const VOICE_PRESETS = {
  Jamie: {
    pitch: 0.85,
    rate: 1.1,
    language: 'en-GB',
    preferredNames: ['Google UK English Male', 'Microsoft Ryan', 'Daniel'],
  },
  Spike: {
    pitch: 1.1,
    rate: 1.2,
    language: 'en-US',
    preferredNames: ['Google US English', 'Microsoft Guy', 'Alex'],
  },
  Ghost: {
    pitch: 0.7,
    rate: 0.9,
    language: 'en-AU',
    preferredNames: ['Microsoft Natasha', 'Karen', 'Google UK English Female'],
  },
  Nova: {
    pitch: 1,
    rate: 1,
    language: 'en-US',
    preferredNames: ['Microsoft Aria', 'Samantha', 'Google US English'],
  },
  Sage: {
    pitch: 0.95,
    rate: 0.95,
    language: 'en-US',
    preferredNames: ['Microsoft Guy', 'Alex', 'Google US English'],
  },
  Raven: {
    pitch: 0.7,
    rate: 0.9,
    language: 'en-GB',
    preferredNames: ['Microsoft Sonia', 'Serena', 'Google UK English Female'],
  },
} satisfies Record<string, VoicePreset>;

export type JamieVoicePreset = keyof typeof VOICE_PRESETS;

export const JAMIE_VOICE_CHOICES: Array<{
  id: JamieVoicePreset;
  label: string;
  description: string;
}> = [
  { id: 'Jamie', label: 'Jamie', description: 'Measured British delivery' },
  { id: 'Spike', label: 'Spike', description: 'Fast American delivery' },
  { id: 'Ghost', label: 'Ghost', description: 'Low Australian delivery' },
  { id: 'Nova', label: 'Nova', description: 'Clear American delivery' },
  { id: 'Sage', label: 'Sage', description: 'Calm American delivery' },
  { id: 'Raven', label: 'Raven', description: 'Low British delivery' },
];

const DEFAULT_PRESET: VoicePreset = VOICE_PRESETS.Jamie;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechRequestId = 0;

function emit(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

function loadVoices(synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const available = synthesis.getVoices();
  if (available.length > 0) return Promise.resolve(available);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synthesis.removeEventListener('voiceschanged', finish);
      resolve(synthesis.getVoices());
    };

    synthesis.addEventListener('voiceschanged', finish, { once: true });
    window.setTimeout(finish, 750);
  });
}

function resolvePreset(voiceName: string): VoicePreset {
  return VOICE_PRESETS[voiceName as JamieVoicePreset] || DEFAULT_PRESET;
}

function selectVoice(voices: SpeechSynthesisVoice[], voiceName: string, preset: VoicePreset) {
  const exactCustomVoice = voices.find((voice) => voice.name.toLowerCase() === voiceName.toLowerCase());
  if (exactCustomVoice) return exactCustomVoice;

  for (const preferredName of preset.preferredNames) {
    const preferred = voices.find((voice) => voice.name.toLowerCase().includes(preferredName.toLowerCase()));
    if (preferred) return preferred;
  }

  const exactLanguage = voices.find((voice) => voice.lang.toLowerCase() === preset.language.toLowerCase());
  return exactLanguage
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(preset.language.slice(0, 2).toLowerCase()))
    || voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
}

export const stopSpeaking = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  speechRequestId += 1;
  window.speechSynthesis.cancel();
  activeUtterance = null;
  emit(TTS_END_EVENT);
};

export const speak = (text: string, voiceName: string = 'Jamie', onEnd?: () => void) => {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
    onEnd?.();
    return;
  }

  if (localStorage.getItem('jamie_voice_enabled') === 'false') {
    onEnd?.();
    return;
  }

  const synthesis = window.speechSynthesis;
  const requestId = ++speechRequestId;
  synthesis.cancel();

  void loadVoices(synthesis).then((voices) => {
    if (requestId !== speechRequestId || localStorage.getItem('jamie_voice_enabled') === 'false') {
      onEnd?.();
      return;
    }

    const preset = resolvePreset(voiceName);
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = selectVoice(voices, voiceName, preset);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = preset.pitch;
    utterance.rate = preset.rate;
    utterance.volume = 0.8;

    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      if (activeUtterance === utterance) activeUtterance = null;
      emit(TTS_END_EVENT);
      onEnd?.();
    };

    utterance.onend = complete;
    utterance.onerror = complete;
    activeUtterance = utterance;
    emit(TTS_START_EVENT);
    synthesis.speak(utterance);
  });
};
