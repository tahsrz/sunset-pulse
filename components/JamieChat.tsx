'use client';

import { useState, useEffect } from 'react';
import { getJamieResponse } from '@/lib/ai/jamie'; // We'll create this next

interface JamieChatProps {
  propertyData?: any; // Pass RentCast data here
}

export default function JamieChat({ propertyData }: JamieChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Jamie's Voice (TTS) - Replacing pyttsx3
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // You can tune these to sound more like a 'cool' assistant
    utterance.pitch = 0.9; 
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    // Web Speech API - Replacing speech_recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser doesn't support speech.");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = async (event: any) => {
      const command = event.results[0][0].transcript;
      setTranscript(command);
      setIsListening(false);

      // Trigger Jamie logic
      setIsTyping(true);
      const aiReply = await getJamieResponse(command, propertyData);
      setResponse(aiReply);
      setIsTyping(false);
      
      speak(aiReply); // Make Jamie talk back
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="fixed bottom-5 right-5 flex flex-col items-end gap-3">
      {response && (
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm font-semibold text-blue-600">Jamie:</p>
          <p className="text-gray-800 italic">"{response}"</p>
        </div>
      )}

      <button
        onClick={startListening}
        className={`p-4 rounded-full shadow-2xl transition-all ${
          isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
      >
        {isListening ? (
          <span className="text-xs font-bold">LISTENING...</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">ASK JAMIE</span>
          </div>
        )}
      </button>
      
      {transcript && <p className="text-xs text-gray-400">You said: {transcript}</p>}
    </div>
  );
}