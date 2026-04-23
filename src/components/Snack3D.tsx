"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  /** Bedrock model filename without extension, e.g. "oran_berry". */
  fruitModel?: string | null;
  /** Fruit texture filename without extension, e.g. "oran". */
  fruitTexture?: string | null;
  /** Up to 3 placements on the snack top face, in pixel units. */
  snackPositionings?: Array<{
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
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
 * Renders a berry using its actual Cobblemon Bedrock `.geo.json` model and
 * fruit texture — faithful to PokeSnackBlockEntityRenderer.kt. Positions
 * and rotations come from `berry.snackPositionings[index]` which mirror the
 * upstream `pokeSnackPositionings` data. All coordinates in the model are in
 * Minecraft pixels (16 units per block), so we scale by 1/16.
 *
 * Falls back to two crossed textured planes when the 3D model or fruit
 * texture can't be resolved (e.g. legacy seasonings without geo).
 */
type BedrockDoc = import("@/lib/bedrock/geo").BedrockFile;

const geoCache = new Map<string, Promise<BedrockDoc>>();
async function loadGeo(fruitModel: string): Promise<BedrockDoc> {
  const url = `/textures/cobblemon/bedrock/berries/${fruitModel}.geo.json`;
  let p = geoCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`geo 404: ${fruitModel}`);
      return r.json() as Promise<BedrockDoc>;
    });
    geoCache.set(url, p);
  }
  return p;
}

/**
 * Resolve the texture for an ingredient in a snack slot. Berries come with
 * their fruit sheet; vanilla bait seasonings (apple, golden_apple, glow_berries,
 * sweet_berries, etc.) fall back to their Minecraft item sprite.
 */
function resolveSeasoningTexture(berry: BerryPlacement): string {
  if (berry.fruitTexture) {
    return `/textures/cobblemon/berries/${berry.fruitTexture}.png`;
  }
  const [ns, raw] = berry.itemId.includes(":")
    ? berry.itemId.split(":", 2)
    : ["cobblemon", berry.itemId];
  if (ns === "minecraft") {
    // enchanted_golden_apple shares the golden_apple sprite in vanilla.
    const name =
      raw === "enchanted_golden_apple" ? "golden_apple" : raw;
    return `/textures/minecraft/item/${name}.png`;
  }
  if (raw.endsWith("_berry")) {
    return `/textures/cobblemon/item/berries/${raw}.png`;
  }
  return `/textures/cobblemon/item/${raw}.png`;
}

function BerryOnTop({
  berry,
  index,
  totalCount,
}: {
  berry: BerryPlacement;
  index: number;
  totalCount: number;
}) {
  const texUrl = resolveSeasoningTexture(berry);
  // Wrap useLoader in an error boundary via a lazy fallback: Three's
  // useLoader throws synchronously on 404, which kills the whole Canvas.
  // We pre-check with a stateful loader to keep the canvas alive.
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    new TextureLoader().load(
      texUrl,
      (t) => {
        if (cancelled) return;
        pixelate(t);
        setTexture(t);
      },
      undefined,
      () => {
        /* 404 — leave texture null, component renders nothing */
      },
    );
    return () => {
      cancelled = true;
    };
  }, [texUrl]);

  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!berry.fruitModel) return;
    loadGeo(berry.fruitModel)
      .then(async (doc) => {
        if (cancelled) return;
        const { boneToGeometry, firstBone } = await import("@/lib/bedrock/geo");
        const g = doc["minecraft:geometry"]?.[0];
        const bone = g ? firstBone(g) : null;
        if (!g || !bone) return;
        setGeometry(boneToGeometry(bone, g));
      })
      .catch(() => {
        /* model missing — fall back to plane below */
      });
    return () => {
      cancelled = true;
    };
  }, [berry.fruitModel]);

  const material = useMemo(
    () =>
      texture
        ? new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
          })
        : null,
    [texture],
  );

  if (!material) return null;

  // Placement resolution: pick the matching index, with the same fallback
  // behaviour as the mod (1-berry variant uses index 0 centred, etc.).
  const positionings = berry.snackPositionings ?? [];
  const placement =
    positionings[Math.min(index, positionings.length - 1)] ?? null;

  // MC model units are pixels (16 per block). The model origin in the game
  // is at the block's local origin; subtract 0.5 blocks to center it on our
  // snack which is drawn around x=0, z=0. y=0 sits on the snack top face.
  const px = placement ? placement.position.x / 16 - 0.5 : 0;
  const py = placement ? placement.position.y / 16 - (7 / 16) : 0;
  const pz = placement ? placement.position.z / 16 - 0.5 : 0;

  const rx = placement ? THREE.MathUtils.degToRad(placement.rotation.x) : 0;
  const ry = placement ? THREE.MathUtils.degToRad(placement.rotation.y) : 0;
  const rz = placement ? THREE.MathUtils.degToRad(placement.rotation.z) : 0;

  if (geometry) {
    // The cube coordinates in the .geo.json are in pixel space, so we scale
    // the whole mesh by 1/16 to bring it into Three.js block-units.
    return (
      <group position={[px, py, pz]} rotation={[rx, ry, rz]}>
        <mesh
          geometry={geometry}
          material={material}
          scale={[1 / 16, 1 / 16, 1 / 16]}
        />
      </group>
    );
  }

  // Fallback: crossed planes (MC plant-style) so seasonings without geo still
  // show something.
  const size = 0.28;
  const H = 7 / 16;
  const y = H + size / 2 - 0.02;
  const d = totalCount === 1 ? 0 : 0.25;
  const fx = totalCount === 1 ? 0 : index === 0 ? -d / 2 : index === 1 ? d / 2 : 0;
  const fz = totalCount <= 2 ? 0 : index === 2 ? d / 2 : -d / 4;
  return (
    <group position={[fx, y, fz]}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[size, size]} />
        <primitive object={material} attach="material" />
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

  // Berry placements are now read per-berry from pokeSnackPositionings inside
  // BerryOnTop. No global lookup table needed here.

  return (
    <group ref={group}>
      <mesh position={[0, H / 2, 0]} geometry={geo} material={mats} />
      {berries.map((b, i) => (
        <BerryOnTop
          key={`${b.slug}-${i}`}
          berry={b}
          index={i}
          totalCount={berries.length}
        />
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
