'use client';

import { Check, Volume2, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { JAMIE_VOICE_CHOICES, speak, stopSpeaking, type JamieVoicePreset } from '@/lib/core/tts';

type JamieCharacterCreationProps = {
  open: boolean;
  onComplete: () => void;
};

const PREVIEW_LINE = 'I am Jamie. Let us pull up what matters and get to work.';

export default function JamieCharacterCreation({ open, onComplete }: JamieCharacterCreationProps) {
  const { jamieVoice, setJamieVoice } = useTheme();

  if (!open) return null;

  const choose = (voice: JamieVoicePreset) => {
    setJamieVoice(voice);
    speak(PREVIEW_LINE, voice);
  };

  const complete = () => {
    stopSpeaking();
    localStorage.setItem('jamie_character_created', 'true');
    onComplete();
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-end bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="jamie-character-title">
      <div className="w-full max-w-lg border border-white/15 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Character Creation</p>
            <h2 id="jamie-character-title" className="mt-1 text-xl font-black text-white">Choose Jamie&apos;s voice</h2>
          </div>
          <button type="button" onClick={complete} className="grid h-8 w-8 place-items-center text-slate-400 hover:text-white" aria-label="Close character creation">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {JAMIE_VOICE_CHOICES.map((voice) => {
            const selected = jamieVoice === voice.id;
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => choose(voice.id)}
                className={`flex min-h-16 items-center gap-3 border p-3 text-left transition ${selected ? 'border-emerald-300 bg-emerald-300/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center ${selected ? 'bg-emerald-300 text-slate-950' : 'bg-white/10 text-white'}`}>
                  {selected ? <Check size={16} /> : <Volume2 size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-white">{voice.label}</span>
                  <span className="block text-[10px] leading-4 text-slate-400">{voice.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={complete} className="mt-5 w-full bg-emerald-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950">
          Continue with {jamieVoice}
        </button>
      </div>
    </div>
  );
}
