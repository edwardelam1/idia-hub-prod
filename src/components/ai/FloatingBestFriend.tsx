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

  // Proactive security monitoring
  useEffect(() => {
    if (userRole === 'super-admin') {
      alertIntervalRef.current = window.setInterval(() => {
        const securityChecks = [
          {
            id: 'system-health',
            type: 'info' as const,
            message: "System health looks good! All agents are operational.",
            route: '/system-health'
          },
          {
            id: 'data-integrity',
            type: 'warning' as const,
            message: "I noticed some unusual data patterns. Want me to show you the analytics?",
            route: '/analytics'
          },
          {
            id: 'security-scan',
            type: 'critical' as const,
            message: "Security scan detected potential vulnerabilities. Let's review them together.",
            route: '/security'
          }
        ];

        // Simulate random security insights
        if (Math.random() > 0.7) {
          const randomAlert = securityChecks[Math.floor(Math.random() * securityChecks.length)];
          showProactiveAlert(randomAlert);
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    };
  }, [userRole, navigate]);

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

  // Contextual reactions to route changes
  useEffect(() => {
    const routeReactions = {
      '/dashboard': () => {
        setEmotion('calm');
        if (Math.random() > 0.8) {
          setTimeout(() => {
            toast("Welcome back! Everything's running smoothly. Want to see today's highlights?", {
              duration: 5000
            });
          }, 2000);
        }
      },
      '/security': () => {
        setEmotion('excited');
        toast("Good choice! I've been monitoring some security patterns. Let me help you review them.", {
          duration: 6000
        });
      },
      '/system-health': () => {
        setEmotion('calm');
        toast("All systems are green! But I'll keep watching for any anomalies.", {
          duration: 4000
        });
      },
      '/organizations': () => {
        setEmotion('neutral');
        if (Math.random() > 0.7) {
          toast("I noticed some organizations might need attention. Want me to highlight them?", {
            duration: 5000
          });
        }
      }
    };

    const reaction = routeReactions[location.pathname as keyof typeof routeReactions];
    if (reaction) {
      setTimeout(reaction, 1000);
    }
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