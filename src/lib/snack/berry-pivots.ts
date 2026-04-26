/**
 * Per-berry pivot/transform overrides applied on top of the auto-bottom
 * anchoring done in `boneToGeometry`. The geometry is already recentered
 * so every berry sits on Y=0 (its lowest point) with its bounding-box
 * X/Z midpoint at the origin — but some models still need a small nudge
 * to look right on the Poké Snack top face (a stem peeking through, a
 * leaf rotated weirdly, a slightly tilted body…).
 *
 * Tune these values live at /debug/snack: pick a slug, drag the sliders,
 * then hit "Copy JSON" and paste the result here. Values are in world
 * units (1 unit = 1 block = 16 MC pixels) and degrees.
 *
 * Empty by default: most berries should already render correctly with
 * the auto-anchor.
 */

export type BerryPivot = {
  dx?: number;
  dy?: number;
  dz?: number;
  rx?: number; // degrees, applied before the snack-positioning rotation
  ry?: number;
  rz?: number;
  /** Multiplier applied to the geometry scale (default 1). */
  scale?: number;
};

export const BERRY_PIVOTS: Record<string, BerryPivot> = {
  // example:
  // razz_berry: { dy: 0.02 },
};

export function getBerryPivot(slug: string): BerryPivot {
  return BERRY_PIVOTS[slug] ?? {};
}
