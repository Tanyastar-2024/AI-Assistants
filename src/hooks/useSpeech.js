import { useState, useRef, useCallback } from "react";

/* ---------------- TEXT TO SPEECH ---------------- */

export function useTextToSpeech() {
  const utteranceRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}

/* ---------------- SPEECH TO TEXT ---------------- */

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef(null);

  const startListening = useCallback((onResult) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const text = event.results[event.results.length - 1][0].transcript;

      setTranscript(text);

      if (onResult) {
        onResult(text);
      }
    };

    recognition.start();

    recognitionRef.current = recognition;
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  };
}