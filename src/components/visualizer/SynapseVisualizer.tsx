
import { useEffect, useRef, useState } from 'react';
import { usePipelineActivity } from '@/hooks/usePipelineActivity';

const SynapseVisualizer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const [showLabel, setShowLabel] = useState(true);
  
  // Connect to real pipeline activity
  const { activities, isActive, activityCount } = usePipelineActivity();

  useEffect(() => {
    // Label animation cycle: show for 10s, hide for 50s (1min total cycle)
    const labelCycle = () => {
      setShowLabel(true);
      
      // Hide after 10 seconds
      setTimeout(() => {
        setShowLabel(false);
      }, 10000);
      
      // Show again after 60 seconds (total cycle)
      setTimeout(() => {
        labelCycle();
      }, 60000);
    };

    labelCycle();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Import THREE.js dynamically
    const initVisualizer = async () => {
      // Add THREE.js script to document head if not already present
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

      // Scene setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, containerRef.current!.clientWidth / containerRef.current!.clientHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      
      renderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
      renderer.setClearColor(0x000000, 0);
      containerRef.current!.appendChild(renderer.domElement);

      // Enhanced particle system with pipeline activity influence
      const particleCount = 5000;
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Create a sphere distribution
        const radius = Math.random() * 100 + 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        sizes[i] = Math.random() * 3 + 1;
      }

      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const particleMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
      });
      
      const particleSystem = new THREE.Points(particles, particleMaterial);
      scene.add(particleSystem);

      camera.position.z = 200;

      sceneRef.current = { scene, camera, renderer, particleSystem };
      rendererRef.current = renderer;

      // Animation loop with pipeline activity influence
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);

        const time = Date.now() * 0.0005;
        
        // Base rotation speed influenced by pipeline activity
        const activityMultiplier = isActive ? 2.0 : 1.0;
        particleSystem.rotation.x += 0.001 * activityMultiplier;
        particleSystem.rotation.y += 0.002 * activityMultiplier;

        // Animate particle colors with pipeline influence
        const colors = particleSystem.geometry.attributes.color.array;
        const sizes = particleSystem.geometry.attributes.size.array;
        const color = new THREE.Color();
        
        for (let i = 0; i < colors.length; i += 3) {
          const particleIndex = i / 3;
          const hue = (time * 0.1 + particleIndex * 0.01) % 1;
          
          // Pipeline activity influences color intensity
          const intensity = isActive ? 0.9 : 0.6;
          const saturation = isActive ? 1.0 : 0.8;
          
          color.setHSL(hue, saturation, intensity);
          colors[i] = color.r;
          colors[i + 1] = color.g;
          colors[i + 2] = color.b;
          
          // Pipeline activity influences particle size
          if (isActive) {
            sizes[particleIndex] = Math.sin(time * 2 + particleIndex) * 2 + 3;
          } else {
            sizes[particleIndex] = Math.random() * 3 + 1;
          }
        }

        particleSystem.geometry.attributes.color.needsUpdate = true;
        particleSystem.geometry.attributes.size.needsUpdate = true;

        renderer.render(scene, camera);
      };

      animate();
    };

    initVisualizer();

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [isActive]);

  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      
      {/* Enhanced Animated Label with Pipeline Status */}
      <div 
        className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 backdrop-blur-sm px-4 py-2 rounded-lg transition-opacity duration-1000 ${
          showLabel ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-white text-center">
          <div className="font-semibold flex items-center gap-2">
            IDIA Synapse™
            {isActive && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="text-xs text-gray-300">
            Live Data Flow Network • {activities.length} processed
          </div>
        </div>
      </div>

      {/* Pipeline Activity Indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 bg-green-500 bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full border border-green-400">
          <div className="text-green-300 text-xs font-medium flex items-center gap-1">
            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
            Processing
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      {activities.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-2 max-h-20 overflow-y-auto">
          <div className="text-xs text-gray-300 space-y-1">
            {activities.slice(-3).map((activity, index) => (
              <div key={activity.id} className="flex items-center gap-2 text-xs">
                <div className={`w-1 h-1 rounded-full ${
                  activity.type === 'bundle_created' ? 'bg-purple-400' :
                  activity.type === 'data_processed' ? 'bg-blue-400' : 'bg-green-400'
                }`}></div>
                <span className="truncate">
                  {activity.type === 'bundle_created' && `Bundle: ${activity.details.title}`}
                  {activity.type === 'data_processed' && `Data: ${activity.details.activityType}`}
                  {activity.type === 'user_connected' && `User connected`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SynapseVisualizer;
