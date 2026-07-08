import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, ActivityIndicator, Animated, StyleSheet } from "react-native";
import LogoMark from "./LogoMark";
import colors, { radius, spacing } from "../constants/colors";

const SUBTITLES = [
  "Checking nearby ride providers",
  "Finding the fairest price",
  "Calculating route and estimated fare",
  "Almost there...",
];
const SUBTITLE_INTERVAL_MS = 1500;

function PulseDots() {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const loops = anims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - index) * 160),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [anims]);

  return (
    <View style={styles.dotsRow}>
      {anims.map((anim, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity: anim }]} />
      ))}
    </View>
  );
}

export default function LoadingOverlay({ visible }) {
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;

    setSubtitleIndex(0);
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % SUBTITLES.length);
    }, SUBTITLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LogoMark size={36} style={styles.logo} />
          <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
          <Text style={styles.title}>Comparing fares</Text>
          <Text style={styles.subtitle}>{SUBTITLES[subtitleIndex]}</Text>
          <PulseDots />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    width: "80%",
    maxWidth: 320,
  },
  logo: {
    marginBottom: spacing.sm,
  },
  spinner: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    minHeight: 34,
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginHorizontal: 3,
  },
});
