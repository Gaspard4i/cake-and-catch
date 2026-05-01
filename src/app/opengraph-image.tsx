import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Snack & Catch — Cobblemon companion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#fafaf9";
const FG = "#18181b";
const MUTED = "#71717a";
const ACCENT = "#2563eb";
const BORDER = "#e4e4e7";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BG,
          fontFamily: "Inter, system-ui, sans-serif",
          color: FG,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: FG }}>Snack</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: ACCENT, padding: "0 10px" }}>&</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: FG }}>Catch</div>
          <div style={{ fontSize: 18, color: MUTED, paddingLeft: 24 }}>Cobblemon companion</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: FG,
            }}
          >
            Cook the right snack.
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: ACCENT,
              paddingTop: 4,
            }}
          >
            Catch the right Cobblemon.
          </div>
          <div
            style={{
              fontSize: 28,
              color: MUTED,
              lineHeight: 1.4,
              paddingTop: 28,
              maxWidth: 880,
            }}
          >
            Recipes, seasonings and spawn spots for every Cobblemon — all in one place.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: MUTED,
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex" }}>
            <div style={{ paddingRight: 32 }}>Cobbledex</div>
            <div style={{ paddingRight: 32 }}>Snack maker</div>
            <div style={{ paddingRight: 32 }}>Bait maker</div>
            <div>Aprijuice</div>
          </div>
          <div>snack-and-catch.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
