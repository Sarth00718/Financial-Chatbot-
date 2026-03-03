/**
 * Voice Input Component
 * Speech-to-text and text-to-speech functionality
 */

import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

const VoiceInput = ({ onTranscript, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (synthesis) {
        synthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const speak = (text) => {
    if (!synthesis) {
      alert('Speech synthesis is not supported in your browser');
      return;
    }

    if (isSpeaking) {
      synthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthesis.speak(utterance);
    }
  };

  return {
    isListening,
    isSpeaking,
    toggleListening,
    speak,
    isSupported: !!recognition && !!synthesis,
  };
};

// Voice Button Component
export const VoiceButton = ({ onTranscript, disabled }) => {
  const { isListening, toggleListening, isSupported } = VoiceInput({ onTranscript, disabled });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`
        p-1.5 sm:p-2 rounded-lg transition-all duration-200
        ${isListening 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
          : 'hover:bg-gray-100 text-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isListening ? 'Stop listening' : 'Start voice input'}
    >
      {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
    </button>
  );
};

// Speaker Button Component
export const SpeakerButton = ({ text, disabled }) => {
  const { isSpeaking, speak } = VoiceInput({ onTranscript: () => {}, disabled });

  if (!text) return null;

  return (
    <button
      onClick={() => speak(text)}
      disabled={disabled}
      className={`
        p-1.5 sm:p-2 rounded-lg transition-all duration-200
        ${isSpeaking 
          ? 'bg-blue-100 text-blue-600' 
          : 'hover:bg-gray-100 text-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
    >
      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
    </button>
  );
};

export default VoiceInput;
