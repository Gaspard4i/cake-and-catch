"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { TextureLoader, NearestFilter, type Texture } from "three";
import * as THREE from "three";

/**
 * Faithful reproduction of cobblemon's `poke_snack.json` block model:
 *   - Single cube [1,0,1]→[15,7,15] = 14×7×14 MC units.
 *   - All six faces have `tintindex: 0` (tinted by seasoning colour).
 *   - `top` resolves to `poke_snack_top.png`, `bottom` to `poke_snack_bottom.png`,
 *     `side` to `poke_snack_side.png`. No overlay layer, unlike Poké Cake.
 *   - UVs: sides `[1,9,15,16]`, top/bottom `[1,1,15,15]`.
 *
 * A bait-berry lies flat on the top face (in-game a Poké Snack absorbs a
 * single seasoning — usually a berry from the `bait_seasoning` tag).
 */

const FLAVOUR_TINT: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

/**
 * Pale food-colour palette used by Cobblemon's FoodColourComponent when
 * rendering a cooked item's tint (ARGB-averaged by the mod). Source:
 * `FoodColourComponent.kt`. Pastel-style, designed to look good as snack tints.
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
  top: "/textures/cobblemon/block/food/poke_snack_top.png",
  bottom: "/textures/cobblemon/block/food/poke_snack_bottom.png",
  side: "/textures/cobblemon/block/food/poke_snack_side.png",
};

function pixelate(t: Texture) {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function setFaceUV(
  geo: THREE.BoxGeometry,
  faceIndex: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
) {
  const uv = geo.attributes.uv;
  const tl = [u0 / 16, 1 - v0 / 16];
  const tr = [u1 / 16, 1 - v0 / 16];
  const bl = [u0 / 16, 1 - v1 / 16];
  const br = [u1 / 16, 1 - v1 / 16];
  const base = faceIndex * 4;
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

function computeSnackTint(berries: BerryPlacement[], fallback: string | null): string {
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

/**
 * Renders a berry as two crossed vertical planes (Minecraft plant style —
 * same trick vanilla uses for flowers, saplings and grass). From most angles
 * this reads as a volumetric berry rather than a flat decal, while remaining
 * cheap to render and pixel-perfect with the pixelated source texture.
 *
 * Both planes are DoubleSide so the texture is visible from behind too; we
 * sacrifice depthWrite so the transparent pixels don't punch holes into each
 * other at the cross intersection.
 */
function BerryOnTop({
  berry,
  position,
  size = 0.28,
}: {
  berry: BerryPlacement;
  position: [number, number, number];
  size?: number;
}) {
  const url = `/textures/cobblemon/item/berries/${berry.slug}.png`;
  const texture = useLoader(TextureLoader, url);
  pixelate(texture);

  // Standing upright, halfway embedded so the bottom sits flush on the snack.
  const y = position[1] + size / 2 - 0.02;

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [texture],
  );

  return (
    <group position={[position[0], y, position[2]]}>
      {/* plane A (aligned with X axis) */}
      <mesh rotation={[0, 0, 0]} material={material}>
        <planeGeometry args={[size, size]} />
      </mesh>
      {/* plane B (rotated 90° around Y, forming a cross) */}
      <mesh rotation={[0, Math.PI / 2, 0]} material={material}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

function SnackMesh({
  berries,
  fallbackFlavour,
  potColour,
}: {
  berries: BerryPlacement[];
  fallbackFlavour: string | null;
  potColour: string | null;
}) {
  const group = useRef<THREE.Group>(null);

  const [topTex, bottomTex, sideTex] = useLoader(TextureLoader, [
    TEX.top,
    TEX.bottom,
    TEX.side,
  ]);
  [topTex, bottomTex, sideTex].forEach(pixelate);

  useFrame((_state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  // potColour overrides the berry-derived tint (UI convenience: see README).
  const tintHex = useMemo(() => {
    if (potColour && potColour.toLowerCase() !== "#c9b89e") return potColour;
    return computeSnackTint(berries, fallbackFlavour);
  }, [berries, fallbackFlavour, potColour]);
  const tint = useMemo(() => new THREE.Color(tintHex), [tintHex]);

  const W = 14 / 16;
  const H = 7 / 16;

  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(W, H, W);
    // Face order in BoxGeometry: +x, -x, +y, -y, +z, -z
    setFaceUV(g, 0, 1, 9, 15, 16);
    setFaceUV(g, 1, 1, 9, 15, 16);
    setFaceUV(g, 2, 1, 1, 15, 15); // top
    setFaceUV(g, 3, 1, 1, 15, 15); // bottom
    setFaceUV(g, 4, 1, 9, 15, 16);
    setFaceUV(g, 5, 1, 9, 15, 16);
    return g;
  }, []);

  // Every face is tinted in the snack model.
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: topTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: bottomTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
      new THREE.MeshStandardMaterial({ map: sideTex, color: tint }),
    ],
    [sideTex, topTex, bottomTex, tint],
  );

  // Berry placements on the snack's top face. Y anchors the berry base; the
  // BerryOnTop component lifts the mesh to size/2 above this origin.
  const placements = useMemo<Array<[number, number, number]>>(() => {
    const y = H + 0.005;
    const d = 0.3;
    if (berries.length === 0) return [];
    if (berries.length === 1) return [[0, y, 0]];
    if (berries.length === 2)
      return [
        [-d / 2, y, 0],
        [d / 2, y, 0],
      ];
    // Triangle: one in front, two behind
    return [
      [0, y, d / 2],
      [-d / 2, y, -d / 4],
      [d / 2, y, -d / 4],
    ];
  }, [berries.length, H]);

  return (
    <group ref={group}>
      <mesh position={[0, H / 2, 0]} geometry={geo} material={mats} />
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
   * When set, forces this hex colour as the snack tint, overriding the
   * flavour/berry-derived mix. Represents the "cooking pot colour" picker
   * in the UI — in the actual mod the pot colour is cosmetic only.
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
          <SnackMesh
            berries={berries}
            fallbackFlavour={flavour ?? null}
            potColour={potColour ?? null}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
