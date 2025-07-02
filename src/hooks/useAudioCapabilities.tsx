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
      // Request user media with better error handling
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
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
            const response = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/voice-to-text', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU'
              },
              body: JSON.stringify({ audio: base64Audio })
            });

            if (response.ok) {
              const { text } = await response.json();
              resolve(text);
            } else {
              const errorData = await response.text();
              console.error('Voice-to-text error:', errorData);
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
        const response = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/text-to-speech', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU'
          },
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
          audio.onerror = () => {
            console.error('Audio playback error');
            setIsSpeaking(false);
          };
          await audio.play();
          return;
        } else {
          const errorData = await response.text();
          console.error('Text-to-speech error:', errorData);
        }
      } catch (error) {
        console.error('ElevenLabs not available, using browser TTS:', error);
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