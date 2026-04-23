"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";

const FLAVOUR_COLORS: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

function CakeMesh({
  color = "#f1e7c6",
  accent = "#e85a3a",
}: {
  color?: string;
  accent?: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.3;
  });
  return (
    <group ref={ref}>
      {/* Cake base — Minecraft cake proportions: 7x4x7 pixels → 0.875 × 0.5 × 0.875 */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.875, 0.5, 0.875]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Top frosting */}
      <mesh position={[0, 0.51, 0]}>
        <boxGeometry args={[0.85, 0.02, 0.85]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.15} />
      </mesh>
      {/* Cherry */}
      <mesh position={[0, 0.58, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

export function Cake3D({
  flavour,
  size = 200,
}: {
  flavour?: string | null;
  size?: number;
}) {
  const accent = flavour ? FLAVOUR_COLORS[flavour] ?? "#e85a3a" : "#e85a3a";
  const base = flavour === "SWEET" ? "#fff0f6" : flavour === "SPICY" ? "#ffe1d0" : "#f6ebc6";
  return (
    <div className="rounded-lg border border-border bg-subtle overflow-hidden" style={{ width: size, height: size }}>
      <Canvas camera={{ position: [1.6, 1.2, 1.6], fov: 35 }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow />
        <Suspense fallback={null}>
          <CakeMesh color={base} accent={accent} />
        </Suspense>
      </Canvas>
    </div>
  );
}
