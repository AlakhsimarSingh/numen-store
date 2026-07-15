"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Billboard, Environment, Html, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Flame, Star, Truck } from "lucide-react";
import { Product } from "@/src/types";

const HOLD_MS = 2600;
const FADE_SPEED = 3.2;

function ProductStage({
  products,
  onChangeIndex,
}: {
  products: Product[];
  onChangeIndex: (i: number) => void;
}) {
  const textures = useTexture(products.map((p) => p.image));
  const [index, setIndex] = useState(0);
  const phaseRef = useRef<"in" | "hold" | "out">("in");
  const opacity = useRef(0);
  const timerRef = useRef(0);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  useEffect(() => {
    onChangeIndex(index);
  }, [index, onChangeIndex]);

  useFrame((_, delta) => {
    // gentle mouse-parallax tilt, capped to a small range — never spins away
    if (groupRef.current) {
      const targetY = pointer.x * 0.25;
      const targetX = -pointer.y * 0.15;
      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.06;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.06;
    }

    if (ringRef.current) ringRef.current.rotation.z += delta * 0.15;
    timerRef.current += delta * 1000;

    if (phaseRef.current === "in") {
      opacity.current = Math.min(1, opacity.current + delta * FADE_SPEED);
      if (opacity.current >= 1) {
        phaseRef.current = "hold";
        timerRef.current = 0;
      }
    } else if (phaseRef.current === "hold") {
      if (timerRef.current >= HOLD_MS) phaseRef.current = "out";
    } else {
      opacity.current = Math.max(0, opacity.current - delta * FADE_SPEED);
      if (opacity.current <= 0) {
        setIndex((i) => (i + 1) % products.length);
        phaseRef.current = "in";
      }
    }

    if (materialRef.current) {
      materialRef.current.map = textures[index] as THREE.Texture;
      materialRef.current.opacity = opacity.current;
      materialRef.current.needsUpdate = true;
    }
    if (meshRef.current) {
      const s = 1 + (1 - opacity.current) * 0.04;
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.6} rotationIntensity={0.1} floatIntensity={0.6}>
        <mesh ref={ringRef} position={[0, 0, -0.3]}>
          <ringGeometry args={[1.55, 1.6, 64]} />
          <meshBasicMaterial color="#C9FF3D" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>

        <Billboard>
          <mesh ref={meshRef}>
            <planeGeometry args={[2.1, 2.8]} />
            <meshBasicMaterial ref={materialRef} transparent opacity={0} toneMapped={false} />
          </mesh>
        </Billboard>

        <Html position={[1.9, 1.15, 0]} transform occlude={false} distanceFactor={6}>
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/30 bg-bg/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-accent backdrop-blur-sm">
            <Flame size={11} strokeWidth={2} />
            500+ sold this week
          </div>
        </Html>

        <Html position={[-1.9, -0.15, 0]} transform occlude={false} distanceFactor={6}>
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-bg/90 px-3 py-1.5 font-mono text-[10px] text-ink backdrop-blur-sm">
            <Star size={11} strokeWidth={2} className="fill-accent text-accent" />
            {products[index].rating} rating
          </div>
        </Html>

        <Html position={[1.6, -1.3, 0]} transform occlude={false} distanceFactor={6}>
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-bg/90 px-3 py-1.5 font-mono text-[10px] text-ink backdrop-blur-sm">
            <Truck size={11} strokeWidth={2} />
            Free shipping $50+
          </div>
        </Html>
      </Float>
    </group>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
    </Html>
  );
}

export default function Hero3D({
  products,
  onChangeIndex,
}: {
  products: Product[];
  onChangeIndex: (i: number) => void;
}) {
  return (
    <div className="h-[420px] w-full md:h-[520px]">
      <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#C9FF3D" />
        <pointLight position={[-5, -3, -5]} intensity={0.4} color="#FF4433" />
        <Suspense fallback={<Loader />}>
          <ProductStage products={products} onChangeIndex={onChangeIndex} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}