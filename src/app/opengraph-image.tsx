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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Snack <span style={{ color: ACCENT }}>&</span> Catch
          </div>
          <div
            style={{
              height: 18,
              width: 1,
              background: BORDER,
              margin: "0 6px",
            }}
          />
          <div
            style={{
              fontSize: 18,
              color: MUTED,
              fontWeight: 500,
            }}
          >
            Cobblemon companion
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.045em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Cook the right snack.</span>
            <span style={{ color: ACCENT }}>Catch the right Cobblemon.</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: MUTED,
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            Recipes, seasonings and spawn spots for every Cobblemon — all in
            one place.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: MUTED,
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            <span>Cobbledex</span>
            <span>Snack maker</span>
            <span>Bait maker</span>
            <span>Aprijuice</span>
          </div>
          <div>snack-and-catch.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
