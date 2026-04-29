import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Snack & Catch — Cobblemon companion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
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
          background:
            "linear-gradient(135deg, #fff7ed 0%, #fef3c7 45%, #fde68a 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#1c1917",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#ea580c",
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#78716c",
              fontWeight: 600,
            }}
          >
            Cobblemon companion
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 110,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Cook the right snack.</span>
            <span style={{ color: "#ea580c" }}>Catch the right Cobblemon.</span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#57534e",
              maxWidth: 900,
              lineHeight: 1.35,
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
            fontSize: 26,
            color: "#1c1917",
          }}
        >
          <div style={{ display: "flex", fontWeight: 700 }}>
            Snack <span style={{ color: "#ea580c", margin: "0 8px" }}>&</span>{" "}
            Catch
          </div>
          <div style={{ color: "#78716c" }}>snack-and-catch.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
