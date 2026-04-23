"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { TextureLoader, NearestFilter, type Texture } from "three";
import * as THREE from "three";

/**
 * This 3D preview faithfully reproduces cobblemon's block model
 * `poke_cake.json`:
 *   - Inner cube [1,0,1]â†’[15,7,15] = 14Ã—7Ã—14 MC units.
 *     faces (tintindex:0): north/east/south/west use `side` texture (UV 1,9,15,16),
 *     up uses `top` texture (which resolves to `poke_snack_top_overlay` â€” yes,
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

/**
 * Pale food colour palette used by Cobblemon's FoodColourComponent when
 * rendering a cooked item's tint. Source: `FoodColourComponent.kt` in the mod.
 * These are NOT the vibrant vanilla DyeColor values â€” they're pastel tints
 * designed to look good as cake tints.
 */
const MC_COLOUR: Record<string, string> = {
  white: "#ffffff",
  orange: "#ffc3af",
  magenta: "#af8cff",
  light_blue: "#78c3eb",
  yellow: "#ffe1af",
  pink: "#e1a0ff",
  lime: "#cdffaf",
  gray: "#474f52",
  light_gray: "#9d9d97",
  cyan: "#87ebd7",
  purple: "#9191ff",
  blue: "#78a5ff",
  brown: "#835432",
  green: "#afffb4",
  red: "#ffafd7",
  black: "#000000",
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
  // resolves to poke_snack_top_overlay.png â€” that's intentional upstream.
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
  potColour: string | null;
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

  // Pot colour acts as an OVERRIDE for the cake tint (UI convenience).
  // In the mod itself, the cake tint is 100% derived from berry.colour via
  // FoodColourSeasoningProcessor â€” the pot colour is purely cosmetic on the
  // pot sprite. We surface it as a manual override so the user can preview
  // any pale Cobblemon cake colour even without placing specific berries.
  const tintHex = useMemo(() => {
    if (potColour && potColour.toLowerCase() !== "#c9b89e") return potColour;
    return computeCakeTint(berries, fallbackFlavour);
  }, [berries, fallbackFlavour, potColour]);
  const tint = useMemo(() => new THREE.Color(tintHex), [tintHex]);

  // Match the JSON: 14Ã—7Ã—14 MC units â†’ three.js units (/16).
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
      <mesh position={[0, H / 2, 0]} geometry={innerGeo} material={innerMats} />
      <mesh position={[0, H / 2, 0]} geometry={overlayGeo} material={overlayMats} />

      {berries.map((b, i) => (
        <BerryOnTop key={`${b.slug}-${i}`} berry={b} position={placements[i]} />
      ))}
    </group>
  );
}

export function Snack3D({
  flavour,
  berries = [],
  potColour,
  size = 200,
}: {
  flavour?: string | null;
  berries?: BerryPlacement[];
  /**
   * When set, forces this hex colour as the cake tint, overriding the
   * flavour/berry-derived mix. Represents the "cooking pot colour" picker
   * in the UI â€” in the actual mod the pot colour is cosmetic only.
   */
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
            potColour={potColour ?? null}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
