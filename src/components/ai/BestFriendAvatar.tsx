import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BestFriendAvatarProps {
  onChatClick: () => void;
  onVoiceToggle: (isActive: boolean) => void;
  isListening?: boolean;
  isSpeaking?: boolean;
  emotion?: 'excited' | 'calm' | 'sad' | 'neutral';
  className?: string;
}

const BestFriendAvatar = ({ 
  onChatClick, 
  onVoiceToggle, 
  isListening = false,
  isSpeaking = false,
  emotion = 'neutral',
  className = '' 
}: BestFriendAvatarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const speechIntervalRef = useRef<number | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const handleVoiceClick = () => {
    const newState = !isVoiceActive;
    setIsVoiceActive(newState);
    onVoiceToggle(newState);
  };

  // Simulate syllable changes when speaking
  useEffect(() => {
    if (isSpeaking) {
      speechIntervalRef.current = window.setInterval(() => {
        // This will trigger re-renders and color changes
      }, 150); // Change every 150ms for syllable effect
    } else {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
    }

    return () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initVisualizer = async () => {
      if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const THREE = window.THREE;
      if (!THREE) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 200 / 200, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      
      renderer.setSize(200, 200);
      renderer.setClearColor(0x000000, 0);
      containerRef.current!.appendChild(renderer.domElement);

      // Create particle system (mini version of synapse)
      const particleCount = 1000; // Smaller than synapse's 5000
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Create a sphere distribution
        const radius = Math.random() * 30 + 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        sizes[i] = Math.random() * 2 + 1;
      }

      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const particleMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
      });
      
      const particleSystem = new THREE.Points(particles, particleMaterial);
      scene.add(particleSystem);

      camera.position.z = 100;

      sceneRef.current = { scene, camera, renderer, particleSystem };
      rendererRef.current = renderer;

      // Animation loop
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);

        const time = Date.now() * 0.001;
        
        // Movement speed based on emotion
        let speedMultiplier = 1.0;
        if (emotion === 'excited') speedMultiplier = 3.0;
        else if (emotion === 'sad') speedMultiplier = 0.3;
        else if (isListening || isSpeaking) speedMultiplier = 2.0;

        particleSystem.rotation.x += 0.002 * speedMultiplier;
        particleSystem.rotation.y += 0.003 * speedMultiplier;

        // Color animation based on emotion and state
        const colors = particleSystem.geometry.attributes.color.array;
        const sizes = particleSystem.geometry.attributes.size.array;
        const color = new THREE.Color();
        
        for (let i = 0; i < colors.length; i += 3) {
          const particleIndex = i / 3;
          
          if (emotion === 'excited' || (isSpeaking && Math.random() > 0.3)) {
            // Every particle different color when excited or speaking
            const hue = Math.random();
            const saturation = 0.8 + Math.random() * 0.2;
            const lightness = 0.5 + Math.random() * 0.3;
            color.setHSL(hue, saturation, lightness);
            
            // Rapid size changes
            sizes[particleIndex] = Math.sin(time * 5 + particleIndex) * 2 + 2;
          } else if (emotion === 'sad') {
            // Single calm color - deep blue
            color.setHSL(0.6, 0.8, 0.4);
            sizes[particleIndex] = 1.5;
          } else if (emotion === 'calm') {
            // Few colors - gentle greens and blues
            const baseHue = 0.3 + Math.sin(time + particleIndex * 0.1) * 0.2;
            color.setHSL(baseHue, 0.6, 0.5);
            sizes[particleIndex] = Math.sin(time + particleIndex) * 0.5 + 1.5;
          } else {
            // Neutral - purple theme like original Best Friend
            const hue = 0.8 + Math.sin(time * 0.5 + particleIndex * 0.05) * 0.1;
            color.setHSL(hue, 0.7, 0.6);
            sizes[particleIndex] = Math.sin(time + particleIndex) * 1 + 1.5;
          }
          
          colors[i] = color.r;
          colors[i + 1] = color.g;
          colors[i + 2] = color.b;
        }

        particleSystem.geometry.attributes.color.needsUpdate = true;
        particleSystem.geometry.attributes.size.needsUpdate = true;

        renderer.render(scene, camera);
      };

      animate();
    };

    initVisualizer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [emotion, isListening, isSpeaking]);

  return (
    <div className={`relative ${className}`}>
      {/* Particle Avatar */}
      <div 
        ref={containerRef} 
        className="w-[200px] h-[200px] cursor-pointer rounded-full overflow-hidden"
        onClick={handleVoiceClick}
      />
      
      {/* Thought Bubble for Chat */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
        <Button
          onClick={onChatClick}
          variant="outline"
          size="sm"
          className="rounded-full bg-background/90 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        {/* Bubble tail */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border/50"></div>
      </div>

      {/* Voice Status Indicator */}
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

      {/* Name Label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-sm font-medium text-foreground">Best Friend</p>
      </div>
    </div>
  );
};

export default BestFriendAvatar;