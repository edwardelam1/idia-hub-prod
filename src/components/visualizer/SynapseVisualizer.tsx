import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import { cn } from "@/lib/utils";

const SynapseVisualizer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particleSystem: THREE.Points;
  } | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const isActiveRef = useRef(false);
  const [showLabel, setShowLabel] = useState(true);

  // Connect to real pipeline activity using the IDIA Protocol schema
  const { activities, isActive, activityCount } = usePipelineActivity();

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    // Label animation cycle: show for 10s, hide for 50s (1min total cycle)
    const labelCycle = () => {
      setShowLabel(true);
      const hideTimeout = setTimeout(() => setShowLabel(false), 10000);
      const showTimeout = setTimeout(labelCycle, 60000);

      return () => {
        clearTimeout(hideTimeout);
        clearTimeout(showTimeout);
      };
    };

    labelCycle();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 256;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000,
      );
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      // Particle system with protocol activity influence
      const particleCount = 5000;
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = Math.random() * 100 + 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        sizes[i] = Math.random() * 3 + 1;
      }

      particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      particles.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const particleMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      });

      const particleSystem = new THREE.Points(particles, particleMaterial);
      scene.add(particleSystem);

      camera.position.z = 200;
      sceneRef.current = { camera, renderer, particleSystem };
      rendererRef.current = renderer;

      const resizeObserver = new ResizeObserver(([entry]) => {
        const { width: nextWidth, height: nextHeight } = entry.contentRect;
        if (!nextWidth || !nextHeight) return;

        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight);
      });

      resizeObserver.observe(container);

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        const time = Date.now() * 0.0005;

        // Visual momentum tied to actual pipeline throughput
        const active = isActiveRef.current;
        const activityMultiplier = active ? 2.5 : 1.0;
        particleSystem.rotation.x += 0.001 * activityMultiplier;
        particleSystem.rotation.y += 0.002 * activityMultiplier;

        const colorsAttr = particleSystem.geometry.attributes.color.array;
        const sizesAttr = particleSystem.geometry.attributes.size.array;
        const color = new THREE.Color();

        for (let i = 0; i < colorsAttr.length; i += 3) {
          const pIndex = i / 3;
          const hue = (time * 0.1 + pIndex * 0.01) % 1;

          // Protocol-active colors (higher saturation/intensity during data flow)
          const intensity = active ? 0.95 : 0.6;
          const saturation = active ? 1.0 : 0.7;

          color.setHSL(hue, saturation, intensity);
          colorsAttr[i] = color.r;
          colorsAttr[i + 1] = color.g;
          colorsAttr[i + 2] = color.b;

          if (active) {
            sizesAttr[pIndex] = Math.sin(time * 3 + pIndex) * 2 + 4;
          } else {
            sizesAttr[pIndex] = (pIndex % 3) + 1;
          }
        }

        particleSystem.geometry.attributes.color.needsUpdate = true;
        particleSystem.geometry.attributes.size.needsUpdate = true;
        renderer.render(scene, camera);
      };

      animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      particles.dispose();
      particleMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-64 bg-gray-950 rounded-xl overflow-hidden border border-white/5 shadow-2xl">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Protocol Label */}
      <div
        className={cn(
          "absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 transition-opacity duration-1000",
          showLabel ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="text-white text-center">
          <div className="font-bold text-sm flex items-center gap-2 tracking-tight">
            IDIA Synapse™
            {isActive && (
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse ring-4 ring-emerald-400/20" />
            )}
          </div>
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
            {activityCount} Assets Processed
          </div>
        </div>
      </div>

      {/* Autonomous Activity Feed (Corrected Types) */}
      {activities.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/5 max-h-24 overflow-hidden">
          <div className="space-y-1.5">
            {activities.slice(0, 3).map((activity) => (
              <div key={activity.id} className="flex items-center gap-3">
                <div
  className={`w-1 h-1 rounded-full ${
    activity.type === "bundle_created" ? "bg-purple-400" :
    activity.type === "data_processed" ? "bg-blue-400" :
    activity.type === "delt_transfer" ? "bg-emerald-400" :
    activity.type === "apple_health_sync" ? "bg-rose-400" : // New Color Mapping
    activity.type === "royalty_payment" ? "bg-emerald-500" : // New Color Mapping
    "bg-green-400"
  }`}
></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SynapseVisualizer;
