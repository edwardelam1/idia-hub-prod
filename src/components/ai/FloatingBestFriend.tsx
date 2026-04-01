import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BestFriendAvatar from './BestFriendAvatar';

import { useAudioCapabilities } from '@/hooks/useAudioCapabilities';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, Shield, Activity } from 'lucide-react';

interface FloatingBestFriendProps {
  userRole: string;
}

interface Position {
  x: number;
  y: number;
}

interface SecurityAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  action?: () => void;
  route?: string;
}

const FloatingBestFriend = ({ userRole }: FloatingBestFriendProps) => {
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [isMoving, setIsMoving] = useState(false);
  const [emotion, setEmotion] = useState<'excited' | 'calm' | 'sad' | 'neutral'>('neutral');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const audio = useAudioCapabilities();
  const { user } = useAuth();
  const moveIntervalRef = useRef<number | null>(null);
  const alertIntervalRef = useRef<number | null>(null);

  const isDeltAuthorized = user?.account_status === 'DELT_AUTHORIZED';

  const findSafePosition = (): Position => ({
    x: Math.max(20, Math.min(window.innerWidth - 220, Math.random() * (window.innerWidth - 240))),
    y: Math.max(20, Math.min(window.innerHeight - 220, Math.random() * (window.innerHeight - 240)))
  });

  // Autonomous movement
  useEffect(() => {
    if (!isDragging) {
      moveIntervalRef.current = window.setInterval(() => {
        setPosition(findSafePosition());
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 1000);
      }, 8000 + Math.random() * 7000);
    }
    return () => { if (moveIntervalRef.current) clearInterval(moveIntervalRef.current); };
  }, [isDragging]);

  // Live data monitoring via fetchApi
  useEffect(() => {
    const checkLiveData = async () => {
      try {
        const data = await fetchApi('/api/v1/health/metrics');
        if (data.today_records > 0 && location.pathname === '/dashboard') {
          setFeedbackText(`I've processed ${data.total_records} health records so far.`);
          setEmotion('calm');
          setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, 4000);
        }

        // Only show DELT alerts if authorized
        if (isDeltAuthorized) {
          const secData = await fetchApi('/api/v1/security/events');
          const critical = secData.events?.filter((e: any) => e.severity === 'critical') || [];
          if (critical.length > 0) {
            showProactiveAlert({
              id: 'live-security',
              type: 'critical',
              message: `Critical security event detected. Immediate attention required.`,
              route: '/security'
            });
          }
        }
      } catch (error) {
        console.error('Error checking live data:', error);
      }
    };

    if (userRole === 'super-admin') {
      checkLiveData();
      alertIntervalRef.current = window.setInterval(checkLiveData, 60000);
    }
    return () => { if (alertIntervalRef.current) clearInterval(alertIntervalRef.current); };
  }, [userRole, location.pathname, isDeltAuthorized]);

  const showProactiveAlert = (alert: SecurityAlert) => {
    setEmotion(alert.type === 'critical' ? 'sad' : 'calm');
    setPosition({ x: window.innerWidth - 300, y: window.innerHeight / 2 - 100 });
    setIsMoving(true);

    toast(alert.message, {
      duration: 8000,
      icon: alert.type === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />,
      action: alert.route ? { label: "Show me", onClick: () => { setEmotion('excited'); navigate(alert.route!); } } : undefined
    });

    setTimeout(() => { setIsMoving(false); setEmotion('neutral'); }, 3000);
  };

  // Contextual reactions
  useEffect(() => {
    const reactions: Record<string, () => void> = {
      '/dashboard': () => { setEmotion('calm'); setFeedbackText("Dashboard looking good!"); setTimeout(() => setFeedbackText(''), 4000); },
      '/system-health': () => { setEmotion('calm'); setFeedbackText("System Health Dashboard - All services operational!"); setTimeout(() => setFeedbackText(''), 5000); },
      '/security': () => { setEmotion('excited'); setFeedbackText("Security Command Center active."); setTimeout(() => setFeedbackText(''), 5000); },
      '/marketplace': () => { setEmotion('neutral'); setFeedbackText("Data Marketplace - I can help find optimal bundles."); setTimeout(() => setFeedbackText(''), 5000); },
    };
    const reaction = reactions[location.pathname];
    if (reaction) setTimeout(reaction, 1500);
  }, [location.pathname]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    setEmotion('excited');
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setEmotion('calm');
    setTimeout(() => setEmotion('neutral'), 2000);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleVoiceToggle = async (isActive: boolean) => {
    setIsVoiceMode(isActive);
    if (isActive) {
      setEmotion('excited');
      setFeedbackText('Listening...');
      await audio.startRecording();
    } else {
      setEmotion('neutral');
      setFeedbackText('Processing...');
      const transcribedText = await audio.stopRecording();
      if (transcribedText) {
        setFeedbackText('Thinking...');
        await handleVoiceInput(transcribedText);
      } else {
        setFeedbackText('');
      }
    }
  };

  const handleVoiceInput = async (userInput: string) => {
    try {
      const data = await fetchApi('/api/v1/best-friend/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userInput, context: { currentPage: location.pathname, timestamp: new Date().toISOString(), mode: 'voice' } }),
      });
      setFeedbackText(data.response);
      setEmotion('calm');
      await audio.speak(data.response);
      setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, 3000);
    } catch (error) {
      console.error('Voice interaction error:', error);
      setFeedbackText('Sorry, I had trouble understanding.');
      setEmotion('sad');
      setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, 3000);
    }
  };

  return (
    <>
      <div
        className={`fixed z-50 cursor-move transition-all duration-300 ${isMoving ? 'animate-pulse' : ''} ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
        style={{ left: `${position.x}px`, top: `${position.y}px`, transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)' }}
        onMouseDown={handleMouseDown}
      >
        <BestFriendAvatar
          onChatClick={() => { setIsChatOpen(true); setEmotion('excited'); }}
          onVoiceToggle={handleVoiceToggle}
          emotion={emotion}
          isListening={audio.isRecording}
          isSpeaking={audio.isSpeaking}
          feedbackText={feedbackText}
          className="drop-shadow-2xl"
        />
        {(isMoving || emotion === 'excited') && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 blur-xl -z-10 animate-pulse" />
        )}
      </div>
      <BestFriendChat isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setEmotion('neutral'); }} />
    </>
  );
};

export default FloatingBestFriend;
