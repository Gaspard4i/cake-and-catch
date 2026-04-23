"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { TextureLoader, NearestFilter, type Texture } from "three";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Tints applied to `tintindex: 0` faces (top, bottom, sides) as defined in
 * cobblemon's block model `poke_cake.json`. In-game the tint comes from the
 * dominant seasoning colour. We reproduce that here with solid HTML colours.
 */
const FLAVOUR_TINT: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

const TEX = {
  top: "/textures/cobblemon/block/food/poke_snack_top.png",
  topOverlay: "/textures/cobblemon/block/food/poke_snack_top_overlay.png",
  bottom: "/textures/cobblemon/block/food/poke_snack_bottom.png",
  side: "/textures/cobblemon/block/food/poke_snack_side.png",
  sideOverlay: "/textures/cobblemon/block/food/poke_snack_side_overlay.png",
};

function pixelate(t: Texture) {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  return t;
}

/**
 * Reproduces the Poké Cake block model from Cobblemon: a 14×7×14 box centered
 * at origin (Minecraft units, scaled). Two concentric meshes — the inner one
 * carries the tintable textures (top/bottom/side), the outer one carries the
 * non-tinted overlay textures on top & sides.
 */
function CakeMesh({ flavour }: { flavour: string | null }) {
  const group = useRef<THREE.Group>(null);

  const [top, bottom, side, topOverlay, sideOverlay] = useLoader(TextureLoader, [
    TEX.top,
    TEX.bottom,
    TEX.side,
    TEX.topOverlay,
    TEX.sideOverlay,
  ]);
  [top, bottom, side, topOverlay, sideOverlay].forEach(pixelate);

  useFrame((_state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  const tintHex = flavour ? FLAVOUR_TINT[flavour] ?? "#ffffff" : "#ffffff";
  const tint = useMemo(() => new THREE.Color(tintHex), [tintHex]);

  // Block is 14×7×14 Minecraft pixels → scale to 0.875 × 0.4375 × 0.875
  const W = 14 / 16;
  const H = 7 / 16;

  // BoxGeometry face order: +X (east), -X (west), +Y (up), -Y (down), +Z (south), -Z (north)
  const baseMats = useMemo(
    () =>
      [
        new THREE.MeshStandardMaterial({ map: side, color: tint }),
        new THREE.MeshStandardMaterial({ map: side, color: tint }),
        new THREE.MeshStandardMaterial({ map: top, color: tint }),
        new THREE.MeshStandardMaterial({ map: bottom, color: tint }),
        new THREE.MeshStandardMaterial({ map: side, color: tint }),
        new THREE.MeshStandardMaterial({ map: side, color: tint }),
      ],
    [side, top, bottom, tint],
  );

  const overlayMats = useMemo(
    () =>
      [
        new THREE.MeshStandardMaterial({
          map: sideOverlay,
          transparent: true,
          alphaTest: 0.1,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        new THREE.MeshStandardMaterial({
          map: sideOverlay,
          transparent: true,
          alphaTest: 0.1,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        new THREE.MeshStandardMaterial({
          map: topOverlay,
          transparent: true,
          alphaTest: 0.1,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // no overlay on bottom
        new THREE.MeshStandardMaterial({
          map: sideOverlay,
          transparent: true,
          alphaTest: 0.1,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        new THREE.MeshStandardMaterial({
          map: sideOverlay,
          transparent: true,
          alphaTest: 0.1,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
      ],
    [sideOverlay, topOverlay],
  );

  return (
    <group ref={group}>
      {/* Inner tinted layer */}
      <mesh position={[0, H / 2, 0]} material={baseMats}>
        <boxGeometry args={[W, H, W]} />
      </mesh>
      {/* Outer overlay (white frosting + decorations) */}
      <mesh position={[0, H / 2, 0]} material={overlayMats}>
        <boxGeometry args={[W + 0.001, H + 0.001, W + 0.001]} />
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
  return (
    <div
      className="rounded-lg border border-border bg-subtle overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Canvas camera={{ position: [1.4, 1.1, 1.4], fov: 30 }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <Suspense fallback={null}>
          <CakeMesh flavour={flavour ?? null} />
        </Suspense>
      </Canvas>
    </div>
  );
}
