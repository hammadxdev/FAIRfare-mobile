import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, ScrollView } from "react-native";
import FareResultsSkeleton from "./skeleton/FareResultsSkeleton";
import colors, { radius, spacing } from "../constants/colors";

const SUBTITLES = [
  "Checking nearby ride providers",
  "Finding the fairest price",
  "Calculating route and estimated fare",
  "Almost there...",
];
const SUBTITLE_INTERVAL_MS = 1500;

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
          <Text style={styles.title}>Comparing fares</Text>
          <Text style={styles.subtitle}>{SUBTITLES[subtitleIndex]}</Text>
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
            <FareResultsSkeleton />
          </ScrollView>
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
  results: { width: "100%", maxHeight: 430, marginTop: spacing.md },
  resultsContent: { paddingBottom: spacing.sm },
});
