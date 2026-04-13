import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BestFriendAvatar from './BestFriendAvatar';
import { useAudioCapabilities } from '@/hooks/useAudioCapabilities';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, Shield } from 'lucide-react';

interface FloatingBestFriendProps {
  userRole: string;
}

interface SecurityAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  action?: () => void;
  route?: string;
}

const RESTING_POSITION = { x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 600 };

const FloatingBestFriend = ({ userRole }: FloatingBestFriendProps) => {
  const [position, setPosition] = useState(RESTING_POSITION);
  const [emotion, setEmotion] = useState<'excited' | 'calm' | 'sad' | 'neutral'>('neutral');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [feedbackText, setFeedbackText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const audio = useAudioCapabilities();
  const { user } = useAuth();
  const alertIntervalRef = useRef<number | null>(null);
  const activityTimeoutRef = useRef<number | null>(null);

  const isDeltAuthorized = user?.account_status === 'DELT_AUTHORIZED';

  // Auto-hide after 5s of inactivity
  const resetActivityTimer = useCallback(() => {
    setIsVisible(true);
    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    activityTimeoutRef.current = window.setTimeout(() => setIsVisible(false), 5000);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetActivityTimer));
    resetActivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivityTimer));
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [resetActivityTimer]);

  // Update resting position on resize
  useEffect(() => {
    const onResize = () => {
      if (!isDragging) setPosition({ x: 20, y: window.innerHeight - 120 });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isDragging]);

  // Live data monitoring
  useEffect(() => {
    const checkLiveData = async () => {
      try {
        const data = await fetchApi('/api/v1/health/metrics');
        if (data.today_records > 0 && location.pathname === '/dashboard') {
          setFeedbackText(`I've processed ${data.total_records} health records so far.`);
          setEmotion('calm');
          const timeout = Math.max(5000, `I've processed ${data.total_records} health records so far.`.length * 60);
          setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, timeout);
        }
        if (isDeltAuthorized) {
          const secData = await fetchApi('/api/v1/security/events');
          const critical = secData.events?.filter((e: any) => e.severity === 'critical') || [];
          if (critical.length > 0) {
            showProactiveAlert({
              id: 'live-security',
              type: 'critical',
              message: 'Critical security event detected. Immediate attention required.',
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
    toast(alert.message, {
      duration: 8000,
      icon: alert.type === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />,
      action: alert.route ? { label: "Show me", onClick: () => { setEmotion('excited'); navigate(alert.route!); } } : undefined
    });
    setTimeout(() => setEmotion('neutral'), 3000);
  };

  // Contextual reactions with dynamic timeouts
  useEffect(() => {
    const reactions: Record<string, string> = {
      '/dashboard': "Dashboard looking good!",
      '/system-health': "System Health Dashboard - All services operational!",
      '/security': "Security Command Center active.",
      '/marketplace': "Data Marketplace - I can help find optimal bundles.",
    };
    const msg = reactions[location.pathname];
    if (msg) {
      setTimeout(() => {
        setEmotion('calm');
        setFeedbackText(msg);
        const timeout = Math.max(5000, msg.length * 60);
        setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, timeout);
      }, 1500);
    }
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
    // Return to resting position
    setTimeout(() => {
      setPosition({ x: 20, y: window.innerHeight - 120 });
      setEmotion('neutral');
    }, 500);
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
      const readingTimeMs = Math.max(5000, data.response.length * 60);
      setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, readingTimeMs);
    } catch (error) {
      console.error('Voice interaction error:', error);
      setFeedbackText('Sorry, I had trouble understanding.');
      setEmotion('sad');
      setTimeout(() => { setFeedbackText(''); setEmotion('neutral'); }, 4000);
    }
  };

  return (
    <div
      className={`fixed z-50 cursor-move transition-all duration-700 ease-in-out ${isDragging ? 'scale-110' : 'hover:scale-105'} ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ left: `${position.x}px`, top: `${position.y}px`, transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)' }}
      onMouseDown={handleMouseDown}
    >
      <BestFriendAvatar
        onChatClick={() => { navigate('/best-friend'); setEmotion('excited'); }}
        onVoiceToggle={handleVoiceToggle}
        emotion={emotion}
        isListening={audio.isRecording}
        isSpeaking={audio.isSpeaking}
        feedbackText={feedbackText}
        className="drop-shadow-2xl"
      />
      {emotion === 'excited' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 blur-xl -z-10 animate-pulse" />
      )}
    </div>
  );
};

export default FloatingBestFriend;
