import { useState, useRef, useEffect, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import logoPath from "@assets/logo1_1766695321240.jpg";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("WebGL Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#132743] to-[#0d2137]" />
      {Array.from({ length: 100 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            backgroundColor: Math.random() > 0.7 ? "#F26419" : "#2C88C9",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
            animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function FallbackUI({ onLogin }: { onLogin: () => void }) {
  const [showLogin, setShowLogin] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowLogin(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#132743] to-[#0d2137]">
      <AnimatedBackground />
      
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center z-10">
        <img src={logoPath} alt="Hawk Ridge Systems" className="h-10" />
      </div>

      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center z-10 transition-all duration-1000 ${
          showLogin ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-12">
          <h1 
            className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Lead Intel
          </h1>
          <p 
            className="text-xl md:text-2xl text-white/60 max-w-xl mx-auto px-4"
            style={{ fontFamily: "Hind, sans-serif" }}
          >
            AI-Powered Pre-Call Intelligence
          </p>
        </div>

        <button
          onClick={onLogin}
          className="group relative px-10 py-4 bg-transparent border-2 border-[#2C88C9] rounded-full text-white font-medium text-lg transition-all duration-500 hover:bg-[#2C88C9]/20 hover:border-[#F26419] hover:shadow-[0_0_40px_rgba(44,136,201,0.4)]"
          data-testid="button-login"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          <span className="relative z-10 flex items-center gap-3">
            Enter
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

interface ParticleSystemProps {
  scale: number;
  rotation: number;
  particleCount?: number;
  autoAnimate?: boolean;
}

function generateSupernova(count: number): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  
  const colorCore = new THREE.Color("#ffffff");
  const colorBlue = new THREE.Color("#2C88C9");
  const colorCyan = new THREE.Color("#00d4ff");
  const colorOrange = new THREE.Color("#F26419");
  const colorYellow = new THREE.Color("#ffd700");
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    const r = Math.pow(Math.random(), 0.3) * 2;
    
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
    
    const distNorm = r / 2;
    
    if (distNorm < 0.15) {
      colors[i3] = colorCore.r;
      colors[i3 + 1] = colorCore.g;
      colors[i3 + 2] = colorCore.b;
    } else if (distNorm < 0.35) {
      const t = (distNorm - 0.15) / 0.2;
      const mixColor = colorYellow.clone().lerp(colorOrange, t);
      colors[i3] = mixColor.r;
      colors[i3 + 1] = mixColor.g;
      colors[i3 + 2] = mixColor.b;
    } else if (distNorm < 0.6) {
      const t = (distNorm - 0.35) / 0.25;
      const mixColor = colorOrange.clone().lerp(colorCyan, t);
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i3] = mixColor.r * brightness;
      colors[i3 + 1] = mixColor.g * brightness;
      colors[i3 + 2] = mixColor.b * brightness;
    } else {
      const t = (distNorm - 0.6) / 0.4;
      const mixColor = colorCyan.clone().lerp(colorBlue, t);
      const brightness = 0.4 + Math.random() * 0.4;
      colors[i3] = mixColor.r * brightness;
      colors[i3 + 1] = mixColor.g * brightness;
      colors[i3 + 2] = mixColor.b * brightness;
    }
  }
  
  return { positions, colors };
}

function GalaxyParticles({ scale, rotation, particleCount = 20000, autoAnimate = false }: ParticleSystemProps) {
  const meshRef = useRef<THREE.Points>(null);
  const smoothScaleRef = useRef(1);
  const smoothRotationRef = useRef(0);
  const autoAnimatePhase = useRef(0);
  
  const circleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);
  
  const { positions: targetPositions, colors } = useMemo(() => {
    return generateSupernova(particleCount);
  }, [particleCount]);
  
  const currentPositions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = targetPositions[i * 3];
      pos[i * 3 + 1] = targetPositions[i * 3 + 1];
      pos[i * 3 + 2] = targetPositions[i * 3 + 2];
    }
    return pos;
  }, [particleCount, targetPositions]);

  const velocities = useMemo(() => {
    return new Float32Array(particleCount * 3).fill(0);
  }, [particleCount]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    let targetScale = scale;
    let targetRotation = rotation;
    
    if (autoAnimate) {
      autoAnimatePhase.current += 0.003;
      targetScale = 1 + Math.sin(autoAnimatePhase.current) * 0.15 + 0.15;
      targetRotation = Math.sin(autoAnimatePhase.current * 0.7) * 0.1;
    }
    
    smoothScaleRef.current += (targetScale - smoothScaleRef.current) * 0.008;
    smoothRotationRef.current += (targetRotation - smoothRotationRef.current) * 0.01;
    const currentScale = smoothScaleRef.current;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      const targetX = targetPositions[i3] * currentScale;
      const targetY = targetPositions[i3 + 1] * currentScale;
      const targetZ = targetPositions[i3 + 2] * currentScale;
      
      const dx = targetX - positions[i3];
      const dy = targetY - positions[i3 + 1];
      const dz = targetZ - positions[i3 + 2];
      
      velocities[i3] += dx * 0.003;
      velocities[i3 + 1] += dy * 0.003;
      velocities[i3 + 2] += dz * 0.003;
      
      velocities[i3] *= 0.985;
      velocities[i3 + 1] *= 0.985;
      velocities[i3 + 2] *= 0.985;
      
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y = time * 0.001 + smoothRotationRef.current * 0.3;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={currentPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        map={circleTexture}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.05} />;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLogin(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#132743] to-[#0d2137]">
        <WebGLErrorBoundary fallback={<AnimatedBackground />}>
          <Canvas
            camera={{ position: [0, 2, 6], fov: 60 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <color attach="background" args={['#0a1628']} />
            <fog attach="fog" args={['#0a1628', 5, 15]} />
            <ambientLight intensity={0.5} />
            <GalaxyParticles 
              scale={1} 
              rotation={0} 
              particleCount={15000}
              autoAnimate={true}
            />
            <CameraController />
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 flex items-center z-10">
        <img src={logoPath} alt="Hawk Ridge Systems" className="h-10" data-testid="img-logo" />
      </div>

      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center z-10 transition-all duration-1000 ${
          showLogin ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-12">
          <h1 
            className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
            data-testid="text-headline"
          >
            Lead Intel
          </h1>
          <p 
            className="text-xl md:text-2xl text-white/60 max-w-xl mx-auto px-4"
            style={{ fontFamily: "Hind, sans-serif" }}
            data-testid="text-subheadline"
          >
            AI-Powered Pre-Call Intelligence
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="group relative px-10 py-4 bg-transparent border-2 border-[#2C88C9] rounded-full text-white font-medium text-lg transition-all duration-500 hover:bg-[#2C88C9]/20 hover:border-[#F26419] hover:shadow-[0_0_40px_rgba(44,136,201,0.4)]"
          data-testid="button-enter"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          <span className="relative z-10 flex items-center gap-3">
            Enter
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}
