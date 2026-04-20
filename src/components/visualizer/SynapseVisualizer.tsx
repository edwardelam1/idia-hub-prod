import { useEffect, useRef, useState } from "react";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import { cn } from "@/lib/utils";

const SynapseVisualizer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const [showLabel, setShowLabel] = useState(true);

  // Connect to real pipeline activity using the IDIA Protocol schema
  const { activities, isActive, activityCount } = usePipelineActivity();

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

    const initVisualizer = async () => {
      if (!window.THREE) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        script.async = true;
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const THREE = window.THREE;
      if (!THREE) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current!.clientWidth / containerRef.current!.clientHeight,
        0.1,
        1000,
      );
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

      renderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
      renderer.setClearColor(0x000000, 0);
      containerRef.current!.appendChild(renderer.domElement);

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
      sceneRef.current = { scene, camera, renderer, particleSystem };
      rendererRef.current = renderer;

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        const time = Date.now() * 0.0005;

        // Visual momentum tied to actual pipeline throughput
        const activityMultiplier = isActive ? 2.5 : 1.0;
        particleSystem.rotation.x += 0.001 * activityMultiplier;
        particleSystem.rotation.y += 0.002 * activityMultiplier;

        const colorsAttr = particleSystem.geometry.attributes.color.array;
        const sizesAttr = particleSystem.geometry.attributes.size.array;
        const color = new THREE.Color();

        for (let i = 0; i < colorsAttr.length; i += 3) {
          const pIndex = i / 3;
          const hue = (time * 0.1 + pIndex * 0.01) % 1;

          // Protocol-active colors (higher saturation/intensity during data flow)
          const intensity = isActive ? 0.95 : 0.6;
          const saturation = isActive ? 1.0 : 0.7;

          color.setHSL(hue, saturation, intensity);
          colorsAttr[i] = color.r;
          colorsAttr[i + 1] = color.g;
          colorsAttr[i + 2] = color.b;

          if (isActive) {
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
    };

    initVisualizer();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [isActive]);

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
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0 shadow-sm",
                    activity.type === "apple_health_sync"
                      ? "bg-rose-400"
                      : activity.type === "synapse_controller"
                        ? "bg-indigo-400"
                        : activity.type === "best_friend_ai"
                          ? "bg-amber-400"
                          : activity.type === "data_sale"
                            ? "bg-cyan-400"
                            : "bg-emerald-400",
                  )}
                />
                <span className="text-[11px] text-gray-200 truncate font-medium">
                  {activity.type === "apple_health_sync" && "Ingestion: Apple Health DELT-Verified"}
                  {activity.type === "synapse_controller" && `Synapse: ${activity.details?.desc || "Gas Billed"}`}
                  {activity.type === "best_friend_ai" && `Research: ${activity.details?.type || "Omni-Fetch"}`}
                  {activity.type === "data_sale" && "Settlement: 60/30/10 Law Executed"}
                  {activity.type === "royalty_payment" && "Royalty: IDIA Life Wallet Settled"}
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
