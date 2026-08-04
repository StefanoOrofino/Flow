/**
 * FrameFlow "Flow Forward" logo exploration marks.
 *
 * Single creative direction — a negative-space "F" built from cinematic
 * frames with forward motion. Six refined variations iterate ONLY on this idea:
 *  1 Aperture F   — negative-space F inside a cinematic frame
 *  2 Filmstrip F  — negative-space F cut from a vertical filmstrip
 *  3 Motion F     — F with trailing frame echoes (forward momentum)
 *  4 Bracket F    — solid F framed by film corner brackets
 *  5 Forward F    — F with forward-slanted arm ends (speed / flow)
 *  6 Play Frame F — app-icon hero: framed F with a play notch
 *
 * Every mark is a single foreground color on a transparent ground, so it can be
 * rendered on dark, light, gold or monochrome backgrounds without edits.
 */
import React from "react";
import Svg, { Path, G } from "react-native-svg";

export type LogoVariant = 1 | 2 | 3 | 4 | 5 | 6;

// Canonical negative-space "F" in a 0..100 grid (used as an even-odd hole
// or a solid glyph depending on the variation).
const F_PATH = "M22,20 H74 V36 H40 V47 H62 V61 H40 V80 H22 Z";

// Rounded cinematic frame (even-odd outer body).
const FRAME = "M22,6 H78 A16,16 0 0 1 94,22 V78 A16,16 0 0 1 78,94 H22 A16,16 0 0 1 6,78 V22 A16,16 0 0 1 22,6 Z";

// Forward-leaning F (arm ends slashed to imply motion).
const F_FORWARD = "M22,20 L74,20 L64,36 L40,36 V47 L62,47 L54,61 L40,61 V80 H22 Z";

function filmstripHoles(): string {
  // small perforation squares down both vertical edges
  const parts: string[] = [];
  const ys = [16, 30, 44, 58, 72];
  for (const y of ys) {
    // left column
    parts.push(`M23,${y} h6 v8 h-6 Z`);
    // right column
    parts.push(`M71,${y} h6 v8 h-6 Z`);
  }
  return parts.join(" ");
}

function renderVariant(v: LogoVariant, color: string) {
  switch (v) {
    case 1: // Aperture F — negative space in a rounded frame
      return <Path d={`${FRAME} ${F_PATH}`} fill={color} fillRule="evenodd" />;

    case 2: // Filmstrip F — vertical strip with perforations + negative F
      return (
        <Path
          d={`M18,6 H82 V94 H18 Z ${filmstripHoles()} ${F_PATH}`}
          fill={color}
          fillRule="evenodd"
        />
      );

    case 3: // Motion F — trailing frame echoes behind a solid F (forward momentum)
      return (
        <G>
          <G transform="translate(-16 0)"><Path d={F_PATH} fill={color} opacity={0.18} /></G>
          <G transform="translate(-8 0)"><Path d={F_PATH} fill={color} opacity={0.42} /></G>
          <Path d={F_PATH} fill={color} />
        </G>
      );

    case 4: // Bracket F — solid F inside film corner brackets
      return (
        <G>
          <Path d={F_PATH} fill={color} />
          <G stroke={color} strokeWidth={5} fill="none" strokeLinecap="square">
            <Path d="M10,26 V10 H26" />
            <Path d="M90,26 V10 H74" />
            <Path d="M10,74 V90 H26" />
            <Path d="M90,74 V90 H74" />
          </G>
        </G>
      );

    case 5: // Forward F — forward-slanted arm ends
      return <Path d={F_FORWARD} fill={color} />;

    case 6: // Play Frame F — framed negative F with a forward "play" notch
      return (
        <G>
          <Path
            d={`${FRAME} ${F_PATH} M64,25 L78,31 L64,37 Z`}
            fill={color}
            fillRule="evenodd"
          />
        </G>
      );
  }
}

export function LogoMark({
  variant = 1,
  color = "#C5A059",
  size = 64,
}: {
  variant?: LogoVariant;
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {renderVariant(variant, color)}
    </Svg>
  );
}

export const LOGO_VARIANTS: { id: LogoVariant; name: string; note: string }[] = [
  { id: 1, name: "Aperture F", note: "Negative-space F inside a cinematic frame" },
  { id: 2, name: "Filmstrip F", note: "F cut from a vertical filmstrip" },
  { id: 3, name: "Motion F", note: "Trailing frame echoes — forward momentum" },
  { id: 4, name: "Bracket F", note: "Solid F framed by film corner brackets" },
  { id: 5, name: "Forward F", note: "Forward-slanted arms for speed & flow" },
  { id: 6, name: "Play Frame F", note: "App-icon hero with a play notch" },
];
