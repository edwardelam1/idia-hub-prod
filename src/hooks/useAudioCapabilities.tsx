import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface AudioCapabilities {
  isRecording: boolean;
  isSpeaking: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

export const useAudioCapabilities = (): AudioCapabilities => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64 for sending to server
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            // Send to voice-to-text edge function
            const response = await fetch('/functions/v1/voice-to-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio })
            });

            if (response.ok) {
              const { text } = await response.json();
              resolve(text);
            } else {
              toast.error('Could not transcribe audio');
              resolve(null);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Transcription failed');
            resolve(null);
          }
        };
        reader.readAsDataURL(audioBlob);
        
        // Cleanup
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Try ElevenLabs first, fallback to browser speech synthesis
      try {
        const response = await fetch('/functions/v1/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text, 
            voice: 'Aria' // Using Aria voice from ElevenLabs
          })
        });

        if (response.ok) {
          const { audioContent } = await response.json();
          const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
          currentAudioRef.current = audio;
          
          audio.onended = () => setIsSpeaking(false);
          await audio.play();
          return;
        }
      } catch (error) {
        console.log('ElevenLabs not available, using browser TTS');
      }

      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      
      // Try to find a good voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Woman') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Aria')
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      toast.error('Could not play audio');
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isRecording,
    isSpeaking,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking
  };
};