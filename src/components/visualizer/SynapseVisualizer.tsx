
import { useEffect, useRef } from 'react';

const SynapseVisualizer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationRef = useRef<number>(0);

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

      // Particle system
      const particleCount = 5000;
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Create a sphere distribution
        const radius = Math.random() * 100 + 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
      }

      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

      // Animation loop
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);

        const time = Date.now() * 0.0005;
        
        // Rotate the particle system
        particleSystem.rotation.x += 0.001;
        particleSystem.rotation.y += 0.002;

        // Animate particle colors
        const colors = particleSystem.geometry.attributes.color.array;
        const color = new THREE.Color();
        
        for (let i = 0; i < colors.length; i += 3) {
          const hue = (time * 0.1 + i * 0.01) % 1;
          color.setHSL(hue, 0.8, 0.6);
          colors[i] = color.r;
          colors[i + 1] = color.g;
          colors[i + 2] = color.b;
        }

        particleSystem.geometry.attributes.color.needsUpdate = true;

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
  }, []);

  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 backdrop-blur-sm px-4 py-2 rounded-lg">
        <div className="text-white text-center">
          <div className="font-semibold">IDIA Synapse™</div>
          <div className="text-xs text-gray-300">Live Data Flow Network</div>
        </div>
      </div>
    </div>
  );
};

export default SynapseVisualizer;
