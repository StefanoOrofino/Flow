import React from "react";

// Frame "F" logo — a metallic gold letter F built as a film strip:
// a vertical bar with sprocket holes plus two solid arms, in a rounded app-icon tile.
export function FrameLogo({ size = 40, withGlow = false, className = "" }) {
  const gid = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="FrameFlow"
      style={withGlow ? { filter: "drop-shadow(0 0 24px rgba(197,160,89,0.5))" } : undefined}
    >
      <defs>
        <linearGradient id={`gold-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EBD08A" />
          <stop offset="50%" stopColor="#C5A059" />
          <stop offset="100%" stopColor="#9A7B3C" />
        </linearGradient>
        <linearGradient id={`tile-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b1b1e" />
          <stop offset="100%" stopColor="#0b0b0d" />
        </linearGradient>
      </defs>

      {/* app-icon tile */}
      <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#tile-${gid})`} stroke="rgba(197,160,89,0.35)" strokeWidth="1.5" />

      {/* vertical film-strip bar of the F */}
      <rect x="26" y="20" width="16" height="60" rx="3" fill={`url(#gold-${gid})`} />
      {/* sprocket holes punched into the vertical bar */}
      {[26, 37, 48, 59, 70].map((y) => (
        <rect key={y} x="31" y={y} width="6" height="5" rx="1.4" fill="#0C0C0E" />
      ))}

      {/* two solid arms of the F */}
      <rect x="42" y="20" width="34" height="15" rx="3" fill={`url(#gold-${gid})`} />
      <rect x="42" y="44" width="26" height="14" rx="3" fill={`url(#gold-${gid})`} />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span className={`font-serif-display text-[1.35rem] leading-none tracking-tight ${className}`}>
      Frame<span className="gold-gradient-text">Flow</span>
    </span>
  );
}
