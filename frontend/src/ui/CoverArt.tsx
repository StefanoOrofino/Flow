import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "./Icon";
import { useTheme } from "@/src/ThemeProvider";

/**
 * Cinematic cover artwork used across the app (Frame.io / Envato style).
 * Shows the real image when available, otherwise a warm gradient with a
 * subtle clapperboard watermark (and optional film-strip edge + scrim).
 * Render inside a container that has `overflow: hidden` and a fixed size.
 */
export function CoverArt({
  imageUrl,
  iconSize = 26,
  showStrip = false,
  scrim = false,
}: {
  imageUrl?: string | null;
  iconSize?: number;
  showStrip?: boolean;
  scrim?: boolean;
}) {
  const { C } = useTheme();
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />;
  }
  return (
    <>
      <LinearGradient
        colors={["#2A2416", "#141210", "#0D0D0F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.watermark}>
        <Icon name="clapperboard" size={iconSize} color={C.brand} strokeWidth={1} />
      </View>
      {showStrip && (
        <View style={styles.strip}>
          {Array.from({ length: 12 }).map((_, i) => <View key={i} style={styles.perf} />)}
        </View>
      )}
      {scrim && <LinearGradient colors={["rgba(8,8,10,0.12)", "rgba(8,8,10,0.9)"]} style={StyleSheet.absoluteFill} />}
    </>
  );
}

const styles = StyleSheet.create({
  watermark: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", opacity: 0.16 },
  strip: { position: "absolute", top: 0, bottom: 0, right: 0, width: 18, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "space-evenly", paddingVertical: 5 },
  perf: { width: 8, height: 5, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.14)" },
});
