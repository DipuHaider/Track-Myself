import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0f1e 0%, #131c33 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 34 }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#34d399" }} />
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#22d3ee" }} />
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#3457d5" }} />
          <div
            style={{
              marginLeft: 12,
              color: "rgba(255,255,255,0.5)",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div style={{ color: "#ffffff", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          Know exactly where
        </div>
        <div style={{ color: "#ffffff", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          every application stands.
        </div>

        <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 30, marginTop: 34, maxWidth: 900 }}>
          Ten pipeline stages · ghost-job flags · ATS, Europass and Designer CVs in real Word
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 46 }}>
          {["Submitted", "Interview", "Offer"].map((label, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 24,
                color: ["#93c5fd", "#67e8f9", "#6ee7b7"][i],
                background: ["#0d1f3b", "#042d34", "#052e16"][i],
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
