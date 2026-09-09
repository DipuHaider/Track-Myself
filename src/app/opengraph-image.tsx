import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori needs raw font bytes. Josefin is vendored in _fonts because next/font keeps
// its copy inaccessible; Geist is read straight from its package so the OG image uses
// the same file the site does. This route is prerendered, so both are read at build.
const JOSEFIN = (weight: "Light" | "Regular") =>
  path.join(process.cwd(), "src/app/_fonts", `JosefinSans-${weight}.ttf`);

const GEIST = (weight: "Regular" | "Bold") =>
  path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans", `Geist-${weight}.ttf`);

export default async function OpengraphImage() {
  const [josefinRegular, geistRegular, geistBold] = await Promise.all([
    readFile(JOSEFIN("Regular")),
    readFile(GEIST("Regular")),
    readFile(GEIST("Bold")),
  ]);

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
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 38 }}>
          <svg width="56" height="56" viewBox="0 0 64 64">
            <path
              d="M36 8 L18 35 L30 35 L28 56 L46 29 L34 29 Z"
              fill="#6d8cff"
              stroke="#6d8cff"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              display: "flex",
              fontFamily: "Josefin Sans",
              fontWeight: 400,
              fontSize: 30,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#ffffff" }}>Track</span>
            <span style={{ color: "rgba(255,255,255,0.62)" }}>Myself</span>
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
                color: ["#93c5fd", "#a5b4fc", "#c4b5fd"][i],
                background: ["#0d1f3b", "#141a3d", "#1c1740"][i],
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 700, style: "normal" },
        { name: "Josefin Sans", data: josefinRegular, weight: 400, style: "normal" },
      ],
    },
  );
}
