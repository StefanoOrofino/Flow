/**
 * FrameFlow Studio — refined LOGO CONCEPTS (matching the approved mood board).
 *
 * Three cinematic directions, single-mark react-native-svg components with an
 * optional metallic GOLD gradient (`gradient` prop). Fixed brand palette
 * gold #C5A059 / ink #232333 / cream #F7F5EF. Scale 16px → 1024px.
 *   1 FRAME F   — an "F" built from a filmstrip stem + two solid bars.
 *   2 FLOW FORWARD — two frames flowing forward with a play mark.
 *   3 DIRECTOR  — a storyboard / timeline list inside a rounded square.
 */
import React from "react";
import Svg, { Rect, Polygon, Defs, LinearGradient, Stop, Mask, G } from "react-native-svg";

export const BRAND_GOLD = "#C5A059";

export type MarkProps = { color?: string; size?: number; gradient?: boolean };

function Gold({ id }: { id: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor="#EBD08A" />
      <Stop offset="0.5" stopColor="#C5A059" />
      <Stop offset="1" stopColor="#9A7B3C" />
    </LinearGradient>
  );
}

/* 1 — FRAME F : filmstrip stem (sprocket holes) + two solid arms. */
export function FrameFMark({ color = BRAND_GOLD, size = 64, gradient }: MarkProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const gid = `g${uid}`, mid = `m${uid}`;
  const fill = gradient ? `url(#${gid})` : color;
  const rows = [19, 29, 39, 49, 59, 69];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        {gradient ? <Gold id={gid} /> : null}
        <Mask id={mid}>
          <Rect x={20} y={14} width={24} height={72} rx={3} fill="white" />
          {rows.map((y, i) => (
            <G key={i}>
              <Rect x={23.5} y={y} width={4} height={5} rx={1} fill="black" />
              <Rect x={36.5} y={y} width={4} height={5} rx={1} fill="black" />
            </G>
          ))}
        </Mask>
      </Defs>
      <Rect x={20} y={14} width={24} height={72} rx={3} fill={fill} mask={`url(#${mid})`} />
      <Rect x={42} y={15} width={42} height={16} rx={3} fill={fill} />
      <Rect x={42} y={42} width={30} height={16} rx={3} fill={fill} />
    </Svg>
  );
}

/* 2 — FLOW FORWARD : two frames flowing forward + play triangle. */
export function FlowForwardMark({ color = BRAND_GOLD, size = 64, gradient }: MarkProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const gid = `g${uid}`;
  const fill = gradient ? `url(#${gid})` : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>{gradient ? <Gold id={gid} /> : null}</Defs>
      <Rect x={14} y={30} width={44} height={42} rx={12} stroke={fill} strokeWidth={8} strokeLinejoin="round" />
      <Rect x={40} y={28} width={45} height={42} rx={12} stroke={fill} strokeWidth={8} strokeLinejoin="round" />
      <Polygon points="55,40 55,58 73,49" fill={fill} />
    </Svg>
  );
}

/* 3 — DIRECTOR : storyboard / timeline list in a rounded square. */
export function DirectorMark({ color = BRAND_GOLD, size = 64, gradient }: MarkProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const gid = `g${uid}`;
  const fill = gradient ? `url(#${gid})` : color;
  const rows = [
    { y: 32, w: 28 },
    { y: 50, w: 20 },
    { y: 68, w: 26 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>{gradient ? <Gold id={gid} /> : null}</Defs>
      <Rect x={18} y={18} width={64} height={64} rx={16} stroke={fill} strokeWidth={6} />
      {rows.map((r, i) => (
        <G key={i}>
          <Rect x={30} y={r.y - 4} width={8} height={8} rx={2} fill={fill} />
          <Rect x={44} y={r.y - 3} width={r.w} height={6} rx={3} fill={fill} />
        </G>
      ))}
    </Svg>
  );
}

export type Concept = {
  id: string;
  n: number;
  name: string;
  descEn: string;
  descIt: string;
  Mark: React.ComponentType<MarkProps>;
};

export const CONCEPTS: Concept[] = [
  { id: "frameF", n: 1, name: "Frame F", Mark: FrameFMark,
    descEn: "An \u201cF\u201d built from film frames. Elegant, recognisable, cinematic.",
    descIt: "La \u201cF\u201d costruita con fotogrammi di pellicola. Elegante, riconoscibile, cinematografica." },
  { id: "flowForward", n: 2, name: "Flow Forward", Mark: FlowForwardMark,
    descEn: "Two frames forming a forward arrow. Creative flow and progression.",
    descIt: "Due frame che creano una freccia in avanti. Flusso creativo e progressione." },
  { id: "director", n: 3, name: "Director", Mark: DirectorMark,
    descEn: "An elegant mark evoking storyboard, timeline and production.",
    descIt: "Un segno elegante che richiama storyboard, timeline e produzione." },
];
