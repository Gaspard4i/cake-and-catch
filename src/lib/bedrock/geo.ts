/**
 * Minimal Bedrock geometry parser → Three.js BufferGeometry + materials.
 *
 * Supports the Cobblemon berry `.geo.json` subset: one or more bones each
 * containing axis-aligned cubes with `origin`, `size`, optional `pivot`
 * and `rotation`, and `uv` either as `[u, v]` (auto box-UV against the
 * declared `texture_width`/`texture_height`) or as a per-face mapping.
 *
 * We build a single BufferGeometry per bone (positions + UVs + indices)
 * so the caller can attach a material with the fruit texture.
 *
 * Reference: PokeSnackBlockEntityRenderer.kt and BerryModelRepository in
 * the Cobblemon source.
 */

import * as THREE from "three";

type Vec3 = { x: number; y: number; z: number } | [number, number, number];

export type BedrockCube = {
  origin: [number, number, number];
  size: [number, number, number];
  uv?: [number, number] | Record<string, BedrockFaceUV>;
  rotation?: [number, number, number];
  pivot?: [number, number, number];
  inflate?: number;
};

type BedrockFaceUV = { uv: [number, number]; uv_size: [number, number] };

export type BedrockBone = {
  name: string;
  pivot?: [number, number, number];
  rotation?: [number, number, number];
  cubes?: BedrockCube[];
  children?: BedrockBone[];
  parent?: string;
};

export type BedrockGeometry = {
  description: {
    identifier: string;
    texture_width: number;
    texture_height: number;
  };
  bones: BedrockBone[];
};

export type BedrockFile = {
  format_version: string;
  "minecraft:geometry": BedrockGeometry[];
};

const FACES = ["north", "east", "south", "west", "up", "down"] as const;
type Face = (typeof FACES)[number];

/**
 * Given a cube with auto-UV [u, v] anchor, compute the per-face UV window
 * following the Bedrock "box UV" layout (unwrapped on a T shape). Values
 * are in texture-pixel coordinates.
 *
 * Layout (x,y,z = size):
 *   up   : [u+z, v]        size (x, z)
 *   down : [u+z+x, v]      size (x, z)   — flipped vertically, handled by swap
 *   west : [u, v+z]        size (z, y)
 *   north: [u+z, v+z]      size (x, y)
 *   east : [u+z+x, v+z]    size (z, y)
 *   south: [u+z+x+z, v+z]  size (x, y)
 */
function autoBoxUV(
  u: number,
  v: number,
  sx: number,
  sy: number,
  sz: number,
): Record<Face, { u: number; v: number; w: number; h: number; flip?: boolean }> {
  return {
    up: { u: u + sz, v, w: sx, h: sz },
    down: { u: u + sz + sx, v, w: sx, h: sz, flip: true },
    west: { u, v: v + sz, w: sz, h: sy },
    north: { u: u + sz, v: v + sz, w: sx, h: sy },
    east: { u: u + sz + sx, v: v + sz, w: sz, h: sy },
    south: { u: u + sz + sx + sz, v: v + sz, w: sx, h: sy },
  };
}

function pushQuad(
  positions: number[],
  uvs: number[],
  indices: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  uvRect: { u: number; v: number; w: number; h: number; flip?: boolean },
  texW: number,
  texH: number,
) {
  const base = positions.length / 3;
  for (const v of [a, b, c, d]) positions.push(v.x, v.y, v.z);

  // In Bedrock UV, (0,0) is top-left; Three.js UV origin is bottom-left.
  const u0 = uvRect.u / texW;
  const u1 = (uvRect.u + uvRect.w) / texW;
  const v0 = 1 - uvRect.v / texH;
  const v1 = 1 - (uvRect.v + uvRect.h) / texH;
  const [tl, tr, bl, br] = uvRect.flip
    ? [
        [u0, v1],
        [u1, v1],
        [u0, v0],
        [u1, v0],
      ]
    : [
        [u0, v0],
        [u1, v0],
        [u0, v1],
        [u1, v1],
      ];
  // Quad order we push is (a, b, c, d) = (TL, TR, BL, BR)
  uvs.push(tl[0], tl[1], tr[0], tr[1], bl[0], bl[1], br[0], br[1]);

  // Two triangles: a-c-b, b-c-d
  indices.push(base + 0, base + 2, base + 1);
  indices.push(base + 1, base + 2, base + 3);
}

export type AnchorMode = "none" | "bottom" | "center" | "bbox-pivot";

/**
 * Build a BufferGeometry containing all cubes of a given bone, flattened,
 * with UVs derived from the Bedrock box-UV layout. Coordinates are in MC
 * pixels; the caller should divide by 16 when placing in world space.
 *
 * `anchor` recenters the geometry so different berry models share a common
 * reference frame:
 *   - "none"        : raw cube origins from the JSON (legacy behaviour)
 *   - "bottom"      : translate so min-Y of the bounding box = 0 and X/Z
 *                     midpoints = 0. Each berry now sits on its lowest point
 *                     at the origin, regardless of how the modeler authored
 *                     it. This is the right default for resting on a snack.
 *   - "center"      : full XYZ bounding-box centre → origin
 *   - "bbox-pivot"  : like "bottom" but Y-min only, no X/Z recentering
 */
export function boneToGeometry(
  bone: BedrockBone,
  geo: BedrockGeometry,
  anchor: AnchorMode = "bottom",
  /** When set, OVERRIDES the anchor: geometry is translated by
   * -(cx, cy, cz) so this exact pixel point ends up at the local
   * origin. Used by the per-berry pivot editor. */
  customPivot?: { cx: number; cy: number; cz: number } | null,
): THREE.BufferGeometry {
  const { texture_width: texW, texture_height: texH } = geo.description;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const cube of bone.cubes ?? []) {
    const [ox, oy, oz] = cube.origin;
    const [sx, sy, sz] = cube.size;

    // 8 corners of the cube (pixel space).
    const x0 = ox;
    const x1 = ox + sx;
    const y0 = oy;
    const y1 = oy + sy;
    const z0 = oz;
    const z1 = oz + sz;

    // Per-cube rotation (Bedrock convention): rotate around `pivot` in
    // degrees, axis order ZYX. Without this, models with rotated cubes
    // — typically 0-thickness leaf quads like nanab_berry — render as
    // flat unrotated planes, breaking the shape.
    const rot = cube.rotation;
    const piv = cube.pivot ?? [0, 0, 0];
    const matrix = rot
      ? (() => {
          const m = new THREE.Matrix4();
          const e = new THREE.Euler(
            THREE.MathUtils.degToRad(rot[0]),
            THREE.MathUtils.degToRad(rot[1]),
            THREE.MathUtils.degToRad(rot[2]),
            "ZYX",
          );
          m.makeTranslation(piv[0], piv[1], piv[2])
            .multiply(new THREE.Matrix4().makeRotationFromEuler(e))
            .multiply(new THREE.Matrix4().makeTranslation(-piv[0], -piv[1], -piv[2]));
          return m;
        })()
      : null;

    const v = (x: number, y: number, z: number) => {
      const out = new THREE.Vector3(x, y, z);
      if (matrix) out.applyMatrix4(matrix);
      return out;
    };

    const uv = Array.isArray(cube.uv)
      ? autoBoxUV(cube.uv[0], cube.uv[1], sx, sy, sz)
      : null;

    // Per-face UVs if provided explicitly
    const perFace = (cube.uv && !Array.isArray(cube.uv)
      ? (cube.uv as Record<Face, BedrockFaceUV>)
      : null);

    const uvOf = (face: Face) => {
      if (uv) return uv[face];
      if (perFace && perFace[face]) {
        const f = perFace[face];
        return { u: f.uv[0], v: f.uv[1], w: f.uv_size[0], h: f.uv_size[1] };
      }
      // Default: 0-size rect so the face draws untextured
      return { u: 0, v: 0, w: 0, h: 0 };
    };

    // Faces (winding so normals point outwards).
    // UP (+Y)
    pushQuad(
      positions,
      uvs,
      indices,
      v(x0, y1, z0),
      v(x1, y1, z0),
      v(x0, y1, z1),
      v(x1, y1, z1),
      uvOf("up"),
      texW,
      texH,
    );
    // DOWN (-Y)
    pushQuad(
      positions,
      uvs,
      indices,
      v(x0, y0, z1),
      v(x1, y0, z1),
      v(x0, y0, z0),
      v(x1, y0, z0),
      uvOf("down"),
      texW,
      texH,
    );
    // NORTH (-Z)
    pushQuad(
      positions,
      uvs,
      indices,
      v(x1, y1, z0),
      v(x0, y1, z0),
      v(x1, y0, z0),
      v(x0, y0, z0),
      uvOf("north"),
      texW,
      texH,
    );
    // SOUTH (+Z)
    pushQuad(
      positions,
      uvs,
      indices,
      v(x0, y1, z1),
      v(x1, y1, z1),
      v(x0, y0, z1),
      v(x1, y0, z1),
      uvOf("south"),
      texW,
      texH,
    );
    // EAST (+X)
    pushQuad(
      positions,
      uvs,
      indices,
      v(x1, y1, z1),
      v(x1, y1, z0),
      v(x1, y0, z1),
      v(x1, y0, z0),
      uvOf("east"),
      texW,
      texH,
    );
    // WEST (-X)
    pushQuad(
      positions,
      uvs,
      indices,
      v(x0, y1, z0),
      v(x0, y1, z1),
      v(x0, y0, z0),
      v(x0, y0, z1),
      uvOf("west"),
      texW,
      texH,
    );
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);

  if (customPivot && positions.length >= 3) {
    g.translate(-customPivot.cx, -customPivot.cy, -customPivot.cz);
  } else if (anchor !== "none" && positions.length >= 3) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    let dx = 0, dy = 0, dz = 0;
    if (anchor === "bottom") {
      dx = -(minX + maxX) / 2;
      dy = -minY;
      dz = -(minZ + maxZ) / 2;
    } else if (anchor === "center") {
      dx = -(minX + maxX) / 2;
      dy = -(minY + maxY) / 2;
      dz = -(minZ + maxZ) / 2;
    } else if (anchor === "bbox-pivot") {
      dy = -minY;
    }
    if (dx || dy || dz) {
      g.translate(dx, dy, dz);
    }
  }

  g.computeVertexNormals();
  return g;
}

export function firstBone(geo: BedrockGeometry): BedrockBone | null {
  return geo.bones[0] ?? null;
}
