import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";

const progressLabel = (elapsedSeconds) => elapsedSeconds >= 20
  ? "Still waiting for verified results…"
  : elapsedSeconds >= 3
    ? "Checking routes and available provider quotes…"
    : "Understanding your request…";

export default function AITypingIndicator() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.row} accessibilityRole="status" accessibilityLiveRegion="polite">
      <Text style={styles.dot}>•</Text>
      <Text style={styles.dot}>•</Text>
      <Text style={styles.dot}>•</Text>
      <Text style={styles.label}>{progressLabel(elapsedSeconds)}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 50,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { color: colors.accent, fontSize: 20, lineHeight: 13, marginRight: 2 },
  label: { color: colors.muted, fontSize: 12, marginLeft: 7 },
});
