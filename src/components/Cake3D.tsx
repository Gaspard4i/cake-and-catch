"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { TextureLoader, NearestFilter, type Texture } from "three";
import * as THREE from "three";

/**
 * This 3D preview faithfully reproduces cobblemon's block model
 * `poke_cake.json`:
 *   - Inner cube [1,0,1]→[15,7,15] = 14×7×14 MC units.
 *     faces (tintindex:0): north/east/south/west use `side` texture (UV 1,9,15,16),
 *     up uses `top` texture (which resolves to `poke_snack_top_overlay` — yes,
 *     the "top" slot in the model maps to the *_overlay asset), down uses
 *     `bottom` (UV 1,1,15,15) with cullface.
 *   - Outer cube (same extent): only the 4 side faces carry `side_overlay`
 *     texture (no top/bottom).
 *
 * The `tintindex: 0` in the model means in-game those faces get tinted by
 * the dominant seasoning colour. Here we mix the colour from the placed
 * berries. The pot (bowl under the cake) is rendered as a neutral white base
 * so the cake remains the visual focus.
 */

const FLAVOUR_TINT: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

const MC_COLOUR: Record<string, string> = {
  white: "#f9fffe",
  light_gray: "#9d9d97",
  gray: "#474f52",
  black: "#1d1d21",
  brown: "#835432",
  red: "#b02e26",
  orange: "#f9801d",
  yellow: "#fed83d",
  lime: "#80c71f",
  green: "#5e7c16",
  cyan: "#169c9c",
  light_blue: "#3ab3da",
  blue: "#3c44aa",
  purple: "#8932b8",
  magenta: "#c74ebd",
  pink: "#f38baa",
};

export type BerryPlacement = {
  slug: string;
  itemId: string;
  colour: string | null;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
};

const TEX = {
  // Matches the model's literal slot names. Note: the model's "top" slot
  // resolves to poke_snack_top_overlay.png — that's intentional upstream.
  top: "/textures/cobblemon/block/food/poke_snack_top_overlay.png",
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
 * Remap UVs of a BoxGeometry face to the `[u0,v0,u1,v1]` window (MC UV space:
 * origin top-left, 16-pixel units). Call once per face before render.
 */
function setFaceUV(
  geo: THREE.BoxGeometry,
  faceIndex: number, // 0..5 in order: +x, -x, +y, -y, +z, -z
  u0: number,
  v0: number,
  u1: number,
  v1: number,
) {
  const uv = geo.attributes.uv;
  // Each face has 4 vertices; MC UV origin is top-left, three.js is bottom-left.
  // Convert: (u/16, 1 - v/16)
  const tl = [u0 / 16, 1 - v0 / 16];
  const tr = [u1 / 16, 1 - v0 / 16];
  const bl = [u0 / 16, 1 - v1 / 16];
  const br = [u1 / 16, 1 - v1 / 16];
  const base = faceIndex * 4;
  // three's BoxGeometry UV layout per face: [TL, TR, BL, BR]
  uv.setXY(base + 0, tl[0], tl[1]);
  uv.setXY(base + 1, tr[0], tr[1]);
  uv.setXY(base + 2, bl[0], bl[1]);
  uv.setXY(base + 3, br[0], br[1]);
  uv.needsUpdate = true;
}

function berryColourHex(b: BerryPlacement): string {
  if (b.colour) {
    const key = b.colour.toLowerCase();
    if (MC_COLOUR[key]) return MC_COLOUR[key];
  }
  if (b.dominantFlavour && FLAVOUR_TINT[b.dominantFlavour]) {
    return FLAVOUR_TINT[b.dominantFlavour];
  }
  return "#ffffff";
}

function computeCakeTint(berries: BerryPlacement[], fallback: string | null): string {
  const placed = berries.filter(Boolean);
  if (placed.length === 0) {
    return fallback ? FLAVOUR_TINT[fallback] ?? "#ffffff" : "#ffffff";
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (const berry of placed) {
    const hex = berryColourHex(berry);
    const int = Number.parseInt(hex.replace("#", ""), 16);
    const rr = (int >> 16) & 0xff;
    const gg = (int >> 8) & 0xff;
    const bb = int & 0xff;
    const w = berry.dominantFlavour ? berry.flavours[berry.dominantFlavour] ?? 1 : 1;
    r += rr * w;
    g += gg * w;
    b += bb * w;
    total += w;
  }
  r = Math.round(r / total);
  g = Math.round(g / total);
  b = Math.round(b / total);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** A berry billboard glued flat on the cake's top face. */
function BerryOnTop({
  berry,
  position,
  size = 0.16,
}: {
  berry: BerryPlacement;
  position: [number, number, number];
  size?: number;
}) {
  const url = `/textures/cobblemon/item/berries/${berry.slug}.png`;
  const texture = useLoader(TextureLoader, url);
  pixelate(texture);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.1}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

function CakeMesh({
  berries,
  fallbackFlavour,
  potColour,
}: {
  berries: BerryPlacement[];
  fallbackFlavour: string | null;
  potColour: string;
}) {
  const group = useRef<THREE.Group>(null);

  const [topTex, bottomTex, sideTex, sideOverlayTex] = useLoader(TextureLoader, [
    TEX.top,
    TEX.bottom,
    TEX.side,
    TEX.sideOverlay,
  ]);
  [topTex, bottomTex, sideTex, sideOverlayTex].forEach(pixelate);

  useFrame((_state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  const tintHex = useMemo(
    () => computeCakeTint(berries, fallbackFlavour),
    [berries, fallbackFlavour],
  );
  const tint = useMemo(() => new THREE.Color(tintHex), [tintHex]);

  // Match the JSON: 14×7×14 MC units → three.js units (/16).
  const W = 14 / 16;
  const H = 7 / 16;

  // --- Inner geometry with model-accurate UVs ---
  const innerGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(W, H, W);
    // Face index: +x (east), -x (west), +y (up), -y (down), +z (south), -z (north)
    // Sides: UV [1, 9, 15, 16]
    setFaceUV(g, 0, 1, 9, 15, 16);
    setFaceUV(g, 1, 1, 9, 15, 16);
    setFaceUV(g, 4, 1, 9, 15, 16);
    setFaceUV(g, 5, 1, 9, 15, 16);
    // Top: UV [1, 1, 15, 15]
    setFaceUV(g, 2, 1, 1, 15, 15);
    // Bottom: UV [1, 1, 15, 15]
    setFaceUV(g, 3, 1, 1, 15, 15);
    return g;
  }, []);

  const innerMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: topTex }), // NOT tinted per model
      new THREE.MeshStandardMaterial({ map: bottomTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
    ],
    [sideTex, topTex, bottomTex, tint],
  );

  // --- Overlay geometry (only 4 side faces, per model) ---
  const overlayGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(W + 0.001, H + 0.001, W + 0.001);
    setFaceUV(g, 0, 1, 9, 15, 16);
    setFaceUV(g, 1, 1, 9, 15, 16);
    setFaceUV(g, 4, 1, 9, 15, 16);
    setFaceUV(g, 5, 1, 9, 15, 16);
    return g;
  }, []);

  const overlayMats = useMemo(() => {
    const sideM = new THREE.MeshStandardMaterial({
      map: sideOverlayTex,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    return [sideM, sideM, invisible, invisible, sideM, sideM];
  }, [sideOverlayTex]);

  // Berry billboards on top
  const placements = useMemo<Array<[number, number, number]>>(() => {
    const y = H + 0.005;
    const d = 0.2;
    if (berries.length === 0) return [];
    if (berries.length === 1) return [[0, y, 0]];
    if (berries.length === 2)
      return [
        [-d / 2, y, 0],
        [d / 2, y, 0],
      ];
    return [
      [0, y, -d / 2],
      [-d / 2, y, d / 3],
      [d / 2, y, d / 3],
    ];
  }, [berries.length, H]);

  return (
    <group ref={group}>
      {/* Cooking Pot plate under the cake — colour picker */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.78, 0.82, 0.08, 24]} />
        <meshStandardMaterial color={potColour} roughness={0.5} />
      </mesh>

      <mesh position={[0, H / 2, 0]} geometry={innerGeo} material={innerMats} />
      <mesh position={[0, H / 2, 0]} geometry={overlayGeo} material={overlayMats} />

      {berries.map((b, i) => (
        <BerryOnTop key={`${b.slug}-${i}`} berry={b} position={placements[i]} />
      ))}
    </group>
  );
}

export function Cake3D({
  flavour,
  berries = [],
  potColour = "#c9b89e",
  size = 200,
}: {
  flavour?: string | null;
  berries?: BerryPlacement[];
  /** Hex colour for the Cooking Pot plate under the cake. Purely cosmetic (upstream pot colour does not affect cake tint). */
  potColour?: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-subtle overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Canvas camera={{ position: [1.4, 1.1, 1.4], fov: 30 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <Suspense fallback={null}>
          <CakeMesh
            berries={berries}
            fallbackFlavour={flavour ?? null}
            potColour={potColour}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
