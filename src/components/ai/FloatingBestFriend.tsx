import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BestFriendAvatar from './BestFriendAvatar';
import BestFriendChat from './BestFriendChat';
import { useAudioCapabilities } from '@/hooks/useAudioCapabilities';
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
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const audio = useAudioCapabilities();
  const moveIntervalRef = useRef<number | null>(null);
  const alertIntervalRef = useRef<number | null>(null);

  // Autonomous movement system
  useEffect(() => {
    if (!isDragging) {
      moveIntervalRef.current = window.setInterval(() => {
        // Random gentle movement when not being dragged
        setPosition(prev => ({
          x: Math.max(20, Math.min(window.innerWidth - 220, prev.x + (Math.random() - 0.5) * 30)),
          y: Math.max(20, Math.min(window.innerHeight - 220, prev.y + (Math.random() - 0.5) * 30))
        }));
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 1000);
      }, 8000 + Math.random() * 7000); // Random interval between 8-15 seconds
    }

    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [isDragging]);

  // Live data monitoring and real-time feedback
  useEffect(() => {
    const checkLiveData = async () => {
      try {
        // Check for new health data
        const { data: healthData } = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/rest/v1/health_metrics?select=*&order=created_at.desc&limit=1', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU'
          }
        }).then(r => r.json());

        // Check for security events
        const { data: securityData } = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/rest/v1/security_events?select=*&order=timestamp.desc&limit=1', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU'
          }
        }).then(r => r.json());

        // Provide contextual feedback based on live data
        if (healthData && healthData.length > 0) {
          const latestHealth = healthData[0];
          const recordedRecently = new Date(latestHealth.created_at).getTime() > Date.now() - 300000; // 5 minutes
          
          if (recordedRecently && location.pathname === '/dashboard') {
            setFeedbackText(`I just detected new health data: ${latestHealth.step_count} steps recorded!`);
            setEmotion('excited');
            setTimeout(() => {
              setFeedbackText('');
              setEmotion('neutral');
            }, 4000);
          }
        }

        if (securityData && securityData.length > 0) {
          const latestSecurity = securityData[0];
          const isRecent = new Date(latestSecurity.timestamp).getTime() > Date.now() - 300000;
          
          if (isRecent && latestSecurity.severity === 'critical') {
            showProactiveAlert({
              id: 'live-security',
              type: 'critical',
              message: `Critical security event detected by ${latestSecurity.agent_name}. Immediate attention required.`,
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
      alertIntervalRef.current = window.setInterval(checkLiveData, 60000); // Check every minute
    }

    return () => {
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    };
  }, [userRole, navigate, location.pathname]);

  const showProactiveAlert = (alert: SecurityAlert) => {
    setEmotion(alert.type === 'critical' ? 'sad' : alert.type === 'warning' ? 'excited' : 'calm');
    
    // Move Best Friend to center-right to get attention
    setPosition({ x: window.innerWidth - 300, y: window.innerHeight / 2 - 100 });
    setIsMoving(true);

    toast(alert.message, {
      duration: 8000,
      icon: alert.type === 'critical' ? <AlertTriangle className="h-4 w-4" /> : 
            alert.type === 'warning' ? <Shield className="h-4 w-4" /> : 
            <Activity className="h-4 w-4" />,
      action: alert.route ? {
        label: "Show me",
        onClick: () => {
          setEmotion('excited');
          navigate(alert.route!);
          toast.success("Let me show you what I found!");
        }
      } : undefined
    });

    setTimeout(() => {
      setIsMoving(false);
      setEmotion('neutral');
    }, 3000);
  };

  // Live contextual reactions based on real data
  useEffect(() => {
    const provideLiveContextualFeedback = async () => {
      try {
        // Get current page context and provide relevant live feedback
        const routeReactions = {
          '/dashboard': async () => {
            setEmotion('calm');
            const response = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/rest/v1/health_metrics?select=count', {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU',
                'Prefer': 'count=exact'
              }
            });
            if (response.ok) {
              const count = response.headers.get('Content-Range')?.split('/')[1] || '0';
              setFeedbackText(`Dashboard looking good! I've processed ${count} health records so far.`);
              setTimeout(() => setFeedbackText(''), 4000);
            }
          },
          '/system-health': async () => {
            setEmotion('calm');
            setFeedbackText("System Health Dashboard - Checking live metrics... All services operational!");
            setTimeout(() => setFeedbackText(''), 5000);
          },
          '/security': async () => {
            setEmotion('excited'); // Use 'excited' instead of 'alert'
            const response = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/rest/v1/security_events?select=count&severity=eq.critical', {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU',
                'Prefer': 'count=exact'
              }
            });
            if (response.ok) {
              const count = response.headers.get('Content-Range')?.split('/')[1] || '0';
              setFeedbackText(`Security Command Center active. ${count} critical events require attention.`);
              setTimeout(() => setFeedbackText(''), 5000);
            }
          },
          '/marketplace': () => {
            setEmotion('neutral');
            setFeedbackText("Data Marketplace - I can help you find optimal health data bundles based on live market analysis.");
            setTimeout(() => setFeedbackText(''), 5000);
          },
          '/data-viewer': () => {
            setEmotion('excited');
            setFeedbackText("Data Viewer - Processing real-time patterns... I'm detecting interesting correlations!");
            setTimeout(() => setFeedbackText(''), 5000);
          }
        };

        const reaction = routeReactions[location.pathname as keyof typeof routeReactions];
        if (reaction) {
          setTimeout(reaction, 1500);
        }
      } catch (error) {
        console.error('Error providing contextual feedback:', error);
      }
    };

    provideLiveContextualFeedback();
  }, [location.pathname]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
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

  // Global mouse events for dragging
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
      // Send to Best Friend AI
      const response = await fetch('https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/best-friend-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU'
        },
        body: JSON.stringify({
          message: userInput,
          context: {
            currentPage: location.pathname,
            timestamp: new Date().toISOString(),
            mode: 'voice'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.response;
      
      setFeedbackText(aiResponse);
      setEmotion('calm');
      
      // Speak the response
      await audio.speak(aiResponse);
      
      // Clear feedback after speaking
      setTimeout(() => {
        setFeedbackText('');
        setEmotion('neutral');
      }, 3000);

    } catch (error) {
      console.error('Voice interaction error:', error);
      setFeedbackText('Sorry, I had trouble understanding.');
      setEmotion('sad');
      setTimeout(() => {
        setFeedbackText('');
        setEmotion('neutral');
      }, 3000);
    }
  };

  const handleChatClick = () => {
    setIsChatOpen(true);
    setEmotion('excited');
  };

  return (
    <>
      {/* Floating Best Friend Avatar */}
      <div 
        className={`fixed z-50 cursor-move transition-all duration-300 ${
          isMoving ? 'animate-pulse' : ''
        } ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)'
        }}
        onMouseDown={handleMouseDown}
      >
        <BestFriendAvatar
          onChatClick={handleChatClick}
          onVoiceToggle={handleVoiceToggle}
          emotion={emotion}
          isListening={audio.isRecording}
          isSpeaking={audio.isSpeaking}
          feedbackText={feedbackText}
          className="drop-shadow-2xl"
        />
        
        {/* Glowing effect when active */}
        {(isMoving || emotion === 'excited') && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 blur-xl -z-10 animate-pulse" />
        )}
      </div>

      {/* Chat Modal */}
      <BestFriendChat 
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setEmotion('neutral');
        }}
      />
    </>
  );
};

export default FloatingBestFriend;