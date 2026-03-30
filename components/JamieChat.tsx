'use client';

import { useState } from 'react';
import { getJamieResponse } from '@/lib/ai/jamie';

interface JamieChatProps {
  propertyData?: any; // Pass RentCast data here
}

export default function JamieChat({ propertyData }: JamieChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Jamie's Voice (TTS) - Optimized for the "Sora/Jamie" vibe
  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    
    // Cancel any ongoing speech so he doesn't overlap himself
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Look for a natural sounding English voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('English United States')) || voices[0];
    
    utterance.voice = preferredVoice;
    utterance.pitch = 0.9; 
    utterance.rate = 1.05; // Slightly faster for that "ready to move" energy
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Browser doesn't support speech recognition. Use Chrome or Edge for the full operative experience.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setResponse(''); // Clear previous response when starting fresh
    };
    
    recognition.onresult = async (event: any) => {
      const command = event.results[0][0].transcript;
      setTranscript(command);
      setIsListening(false);
      setIsTyping(true);

      try {
        // 1. Get Jamie's unified response (Dialogue + Potential JSON)
        const aiReply = await getJamieResponse(command, propertyData);
        
        // 2. Split the dialogue from the JSON data using the protocol delimiter
        const [textPart, jsonPart] = aiReply.split('---JSON---');
        const cleanText = textPart.trim();

        setResponse(cleanText);
        setIsTyping(false);
        speak(cleanText);

        // 3. If Jamie sent back a JSON design update, apply it to the DB
        if (jsonPart) {
          const cleanJson = JSON.parse(jsonPart.trim());
          
          const res = await fetch('/api/jamie/update-site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              newBranding: cleanJson, 
              agentId: 'taz-realty-001' 
            }),
          });

          if (res.ok) {
            // Give him time to finish speaking before refreshing the UI
            setTimeout(() => window.location.reload(), 1800);
          }
        }
      } catch (error) {
        console.error("Operative Error:", error);
        setResponse("Command intercepted but failed to execute. The data might be corrupted.");
        setIsTyping(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  return (
    <div className="fixed bottom-5 right-5 flex flex-col items-end gap-3 z-[9999]">
      {/* Response Bubble */}
      {(response || isTyping) && (
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Jamie</p>
          {isTyping ? (
            <div className="flex gap-1 py-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          ) : (
            <p className="text-gray-800 text-sm leading-relaxed italic">"{response}"</p>
          )}
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={startListening}
        disabled={isTyping}
        className={`group flex items-center justify-center p-4 rounded-full shadow-2xl transition-all active:scale-95 ${
          isListening 
            ? 'bg-red-500 ring-4 ring-red-200 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
        } text-white`}
      >
        {isListening ? (
          <span className="text-xs font-black tracking-tighter">LISTENING</span>
        ) : (
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            <span className="text-sm font-bold pr-1">ASK JAMIE</span>
          </div>
        )}
      </button>
      
      {transcript && !isListening && (
        <p className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
          Last intel: "{transcript}"
        </p>
      )}
    </div>
  );
}