// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* --- SEO --- */}
        <title>FrameFlow Studio — AI Pre-Production Suite for Filmmakers</title>
        <meta
          name="description"
          content="Turn a creative brief into a complete production package — concept, script, storyboard and shot list — in minutes. FrameFlow Studio is the AI pre-production suite for filmmakers, videographers and agencies."
        />
        <meta name="theme-color" content="#0C0C0E" />
        <meta name="author" content="FrameFlow Studio" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* --- Open Graph (Facebook / LinkedIn / iMessage) --- */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="FrameFlow Studio" />
        <meta property="og:title" content="FrameFlow Studio — AI Pre-Production for Filmmakers" />
        <meta
          property="og:description"
          content="From brief to storyboard in minutes. The AI pre-production suite for filmmakers, videographers and agencies."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* --- Twitter / X --- */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FrameFlow Studio — AI Pre-Production for Filmmakers" />
        <meta
          name="twitter:description"
          content="From brief to storyboard in minutes. The AI pre-production suite for filmmakers."
        />
        <meta name="twitter:image" content="/og-image.png" />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
