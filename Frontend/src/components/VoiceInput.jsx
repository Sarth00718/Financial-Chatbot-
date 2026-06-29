/**
 * Voice Input
 * Speech-to-text (mic) and text-to-speech (speaker) hook + MUI buttons.
 */

import { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Mic, MicOff, VolumeUp, VolumeOff } from '@mui/icons-material';

const useVoice = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);

  useEffect(() => {
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
      recognitionInstance.onerror = () => setIsListening(false);
      recognitionInstance.onend = () => setIsListening(false);

      setRecognition(recognitionInstance);
    }

    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
    }

    return () => {
      recognition?.stop();
      synthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const speak = (text) => {
    if (!synthesis) return;
    if (isSpeaking) {
      synthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthesis.speak(utterance);
  };

  return {
    isListening,
    isSpeaking,
    toggleListening,
    speak,
    isSupported: !!recognition && !!synthesis,
  };
};

export const VoiceButton = ({ onTranscript, disabled }) => {
  const { isListening, toggleListening, isSupported } = useVoice({ onTranscript });
  if (!isSupported) return null;

  return (
    <Tooltip title={isListening ? 'Stop listening' : 'Start voice input'}>
      <span>
        <IconButton
          size="small"
          onClick={toggleListening}
          disabled={disabled}
          sx={{
            color: isListening ? '#fff' : 'text.secondary',
            bgcolor: isListening ? 'error.main' : 'transparent',
            '&:hover': { bgcolor: isListening ? 'error.dark' : 'action.hover' },
          }}
        >
          {isListening ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export const SpeakerButton = ({ text, disabled }) => {
  const { isSpeaking, speak } = useVoice({ onTranscript: () => {} });
  if (!text) return null;

  return (
    <Tooltip title={isSpeaking ? 'Stop speaking' : 'Read aloud'}>
      <span>
        <IconButton
          size="small"
          onClick={() => speak(text)}
          disabled={disabled}
          sx={{
            color: isSpeaking ? 'primary.main' : 'text.secondary',
            bgcolor: isSpeaking ? 'action.selected' : 'transparent',
          }}
        >
          {isSpeaking ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default useVoice;
