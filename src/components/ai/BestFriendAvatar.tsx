import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client"; // Verified Sovereign Client

interface BestFriendAvatarProps {
  onChatClick: () => void;
  onVoiceToggle: (isActive: boolean) => void;
  isListening?: boolean;
  isSpeaking?: boolean;
  emotion?: "excited" | "calm" | "sad" | "neutral";
  className?: string;
  feedbackText?: string;
  onAudioResponse?: (text: string) => void;
}

const BestFriendAvatar = ({
  onChatClick,
  onVoiceToggle,
  isListening = false,
  isSpeaking = false,
  emotion = "neutral",
  className = "",
  feedbackText = "",
  onAudioResponse,
}: BestFriendAvatarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const speechIntervalRef = useRef<number | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  /**
   * PROTOCOL TRIGGER: Best Friend AI Handshake
   * This calls the Synapse Engine and pulses the 'Amber' light on the Hub.
   */
  const triggerAIPulse = async (active: boolean) => {
    if (!active) return;

    try {
      // 1. Verify Supabase definition before invocation
      if (typeof supabase === "undefined") {
        throw new Error("Sovereign Client (supabase) is not defined in current scope.");
      }

      // 2. Optional: Initial greeting from Edge Function
      const { data, error } = await supabase.functions.invoke("best-friend-ai", {
        body: { intent: "GREETING", context: "voice_active" },
      });

      if (error) throw error;
      if (data?.text && onAudioResponse) onAudioResponse(data.text);
    } catch (err) {
      console.error("Fate of the World - AI Pipeline Failure:", err);
    }
  };

  const handleVoiceClick = async () => {
    const newState = !isVoiceActive;
    setIsVoiceActive(newState);

    if (newState) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        onVoiceToggle(newState);
        await triggerAIPulse(newState); // Invoke the Engine
      } catch (error) {
        console.error("Microphone permission denied:", error);
        setIsVoiceActive(false);
      }
    } else {
      onVoiceToggle(newState);
    }
  };

  useEffect(() => {
    if (isSpeaking) {
      speechIntervalRef.current = window.setInterval(() => {
        // Re-renders for syllable color oscillation
      }, 150);
    } else {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
    }
    return () => {
      if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initVisualizer = async () => {
      // Ensure THREE is globally available or dynamically loaded
      if (!(window as any).THREE) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const THREE = (window as any).THREE;
      if (!THREE) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

      renderer.setSize(200, 200);
      renderer.setClearColor(0x000000, 0);
      containerRef.current!.appendChild(renderer.domElement);

      const particleCount = 1000;
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = Math.random() * 30 + 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        sizes[i] = Math.random() * 2 + 1;
      }

      particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      particles.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const particleMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });

      const particleSystem = new THREE.Points(particles, particleMaterial);
      scene.add(particleSystem);
      camera.position.z = 100;

      sceneRef.current = { scene, camera, renderer, particleSystem };
      rendererRef.current = renderer;

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        let speedMultiplier =
          emotion === "excited" ? 3.0 : emotion === "sad" ? 0.3 : isListening || isSpeaking ? 2.0 : 1.0;

        particleSystem.rotation.x += 0.002 * speedMultiplier;
        particleSystem.rotation.y += 0.003 * speedMultiplier;

        const colorsAttr = particleSystem.geometry.attributes.color.array;
        const sizesAttr = particleSystem.geometry.attributes.size.array;
        const color = new THREE.Color();

        for (let i = 0; i < colorsAttr.length; i += 3) {
          const idx = i / 3;
          if (emotion === "excited" || (isSpeaking && Math.random() > 0.3)) {
            color.setHSL(Math.random(), 0.8, 0.6);
            sizesAttr[idx] = Math.sin(time * 5 + idx) * 2 + 2;
          } else if (emotion === "sad") {
            color.setHSL(0.6, 0.8, 0.4);
            sizesAttr[idx] = 1.5;
          } else {
            color.setHSL(0.8 + Math.sin(time * 0.5 + idx * 0.05) * 0.1, 0.7, 0.6);
            sizesAttr[idx] = Math.sin(time + idx) * 1 + 1.5;
          }
          colorsAttr[i] = color.r;
          colorsAttr[i + 1] = color.g;
          colorsAttr[i + 2] = color.b;
        }

        particleSystem.geometry.attributes.color.needsUpdate = true;
        particleSystem.geometry.attributes.size.needsUpdate = true;
        renderer.render(scene, camera);
      };

      animate();
    };

    initVisualizer();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [emotion, isListening, isSpeaking]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="w-[200px] h-[200px] cursor-pointer rounded-full overflow-hidden"
        onClick={handleVoiceClick}
      />

      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
        <Button
          onClick={onChatClick}
          variant="outline"
          size="sm"
          className="rounded-full bg-background/90 backdrop-blur-sm border-border/50 shadow-lg"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border/50"></div>
      </div>

      {isVoiceActive && (
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center space-x-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 border border-border/50">
            {isListening ? (
              <Mic className="h-3 w-3 text-green-500 animate-pulse" />
            ) : (
              <MicOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      )}

      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center w-48">
        {feedbackText && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 shadow-lg">
            <p className="text-xs font-medium text-foreground animate-fade-in">{feedbackText}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestFriendAvatar;
