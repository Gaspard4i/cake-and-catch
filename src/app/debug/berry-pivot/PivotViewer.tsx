"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { NearestFilter, TextureLoader } from "three";
import { boneToGeometry, firstBone, type BedrockFile } from "@/lib/bedrock/geo";

type Pivot = { cx: number; cy: number; cz: number };

type Props = {
  slug: string;
  fruitModel: string;
  fruitTexture: string | null;
  itemId: string;
  pivot: Pivot;
  showAxes: boolean;
  showGrid: boolean;
  onBboxComputed: (
    b: { min: [number, number, number]; max: [number, number, number] } | null,
  ) => void;
};

export function PivotViewer(props: Props) {
  return (
    <div className="rounded-lg border border-border bg-subtle overflow-hidden h-full min-h-[500px] relative">
      <Canvas
        camera={{ position: [0.6, 0.45, 0.6], fov: 30, near: 0.01, far: 100 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#f4f4f5"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />

        {props.showAxes && <axesHelper args={[0.5]} />}
        {props.showGrid && (
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

        {/* Origin marker — red cross at (0,0,0). */}
        <OriginCross size={0.12} />

        <Suspense fallback={null}>
          <BerryModel {...props} />
        </Suspense>

        <OrbitControls enablePan enableDamping dampingFactor={0.1} />
      </Canvas>

      <div className="absolute top-2 left-2 rounded-md bg-black/60 text-white text-[10px] font-mono px-2 py-1 pointer-events-none">
        red cross = origin · drag=rotate · scroll=zoom
      </div>
    </div>
  );
}

function pixelate(t: THREE.Texture) {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function resolveTexUrl(slug: string, fruitTexture: string | null, itemId: string) {
  if (fruitTexture) return `/textures/cobblemon/berries/${fruitTexture}.png`;
  const [ns, raw] = itemId.includes(":")
    ? itemId.split(":", 2)
    : ["cobblemon", itemId];
  if (ns === "minecraft") {
    const name = raw === "enchanted_golden_apple" ? "golden_apple" : raw;
    return `/textures/minecraft/item/${name}.png`;
  }
  if (raw.endsWith("_berry")) return `/textures/cobblemon/item/berries/${raw}.png`;
  return `/textures/cobblemon/item/${raw}.png`;
}

const geoCache = new Map<string, Promise<BedrockFile>>();
function loadGeo(fruitModel: string): Promise<BedrockFile> {
  const url = `/textures/cobblemon/bedrock/berries/${fruitModel}.geo.json`;
  let p = geoCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.json() as Promise<BedrockFile>);
    geoCache.set(url, p);
  }
  return p;
}

function BerryModel({
  slug,
  fruitModel,
  fruitTexture,
  itemId,
  pivot,
  onBboxComputed,
}: Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [rawGeo, setRawGeo] = useState<{
    file: BedrockFile;
  } | null>(null);

  useEffect(() => {
    const url = resolveTexUrl(slug, fruitTexture, itemId);
    let cancelled = false;
    new TextureLoader().load(
      url,
      (t) => {
        if (cancelled) return;
        pixelate(t);
        setTexture(t);
      },
      undefined,
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [slug, fruitTexture, itemId]);

  useEffect(() => {
    if (!fruitModel) return;
    let cancelled = false;
    loadGeo(fruitModel).then((file) => {
      if (cancelled) return;
      setRawGeo({ file });
    });
    return () => {
      cancelled = true;
    };
  }, [fruitModel]);

  // Compute the raw bbox once per model so the parent can size sliders.
  useEffect(() => {
    if (!rawGeo) {
      onBboxComputed(null);
      return;
    }
    const g = rawGeo.file["minecraft:geometry"]?.[0];
    const bone = g ? firstBone(g) : null;
    if (!g || !bone) {
      onBboxComputed(null);
      return;
    }
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const c of bone.cubes ?? []) {
      const [ox, oy, oz] = c.origin;
      const [sx, sy, sz] = c.size;
      if (ox < minX) minX = ox; if (ox + sx > maxX) maxX = ox + sx;
      if (oy < minY) minY = oy; if (oy + sy > maxY) maxY = oy + sy;
      if (oz < minZ) minZ = oz; if (oz + sz > maxZ) maxZ = oz + sz;
    }
    if (Number.isFinite(minX)) {
      onBboxComputed({
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
      });
    }
  }, [rawGeo, onBboxComputed]);

  const geometry = useMemo(() => {
    if (!rawGeo) return null;
    const g = rawGeo.file["minecraft:geometry"]?.[0];
    const bone = g ? firstBone(g) : null;
    if (!g || !bone) return null;
    return boneToGeometry(bone, g, "none", {
      cx: pivot.cx,
      cy: pivot.cy,
      cz: pivot.cz,
    });
  }, [rawGeo, pivot.cx, pivot.cy, pivot.cz]);

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

  if (!geometry || !material) return null;

  // 1/16: pixel → block. No Y flip — we render the model in its native
  // orientation so the user can pick a real-world centre.
  return (
    <mesh
      geometry={geometry}
      material={material}
      scale={[1 / 16, 1 / 16, 1 / 16]}
    />
  );
}

function OriginCross({ size }: { size: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const s = size;
    const pts = new Float32Array([
      -s, 0, 0, s, 0, 0,
      0, -s, 0, 0, s, 0,
      0, 0, -s, 0, 0, s,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, [size]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ef4444" />
    </lineSegments>
  );
}
