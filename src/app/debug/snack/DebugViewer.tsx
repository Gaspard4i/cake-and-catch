"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import {
  SnackMesh,
  type BerryDebugOverrides,
  type BerryPlacement,
} from "@/components/Snack3D";

type Props = {
  berries: BerryPlacement[];
  showAxes: boolean;
  showGrid: boolean;
  wireSnack: boolean;
  potColour: string;
  overrides?: BerryDebugOverrides;
};

/**
 * Debug canvas with OrbitControls, axes helper and a grid. Renders the
 * production SnackMesh directly inside our own <Canvas>, with auto-spin
 * disabled so the orbit controls own the scene.
 */
export function DebugViewer({
  berries,
  showAxes,
  showGrid,
  wireSnack,
  potColour,
  overrides,
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-subtle overflow-hidden h-[70vh] min-h-[500px] relative">
      <Canvas
        camera={{ position: [1.8, 1.6, 1.8], fov: 30, near: 0.01, far: 100 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#f4f4f5"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />

        {showAxes && <axesHelper args={[1]} />}
        {showGrid && (
          <Grid
            args={[2, 2]}
            cellSize={1 / 16}
            cellThickness={0.5}
            cellColor="#888"
            sectionSize={0.25}
            sectionThickness={1}
            sectionColor="#444"
            fadeDistance={3}
            fadeStrength={1}
            position={[0, 0, 0]}
          />
        )}

        {/* Horizontal reference at the snack top face (y=7/16). */}
        <YMarker y={7 / 16} color="#22c55e" />

        <Suspense fallback={null}>
          <SnackMesh
            berries={berries}
            fallbackFlavour={null}
            potColour={potColour}
            wireframe={wireSnack}
            spin={false}
            berryDebug={overrides}
          />
        </Suspense>

        <OrbitControls
          enablePan
          enableDamping
          dampingFactor={0.1}
          target={[0, 0.22, 0]}
        />
      </Canvas>

      <div className="absolute top-2 left-2 rounded-md bg-black/60 text-white text-[10px] font-mono px-2 py-1 pointer-events-none">
        drag=rotate · scroll=zoom · right-drag=pan
      </div>
    </div>
  );
}

/** Horizontal rectangle at y=const, drawn as a wireframe for debug. */
function YMarker({ y, color }: { y: number; color: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts = [
      -0.5, y, -0.5,
      0.5, y, -0.5,
      0.5, y, 0.5,
      -0.5, y, 0.5,
      -0.5, y, -0.5,
    ];
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [y]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}
