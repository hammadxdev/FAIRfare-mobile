import React from "react";
import { Text, View, StyleSheet } from "react-native";
import colors, { radius } from "../constants/colors";

const CONFIG = {
  verified: { label: "Verified", background: colors.softGreen, text: colors.forest },
  estimated: { label: "Estimated", background: "#FFF7ED", text: "#C2410C" },
  community: { label: "Community reported", background: "#EFF6FF", text: "#1D4ED8" },
  unavailable: { label: "Not verified", background: colors.dangerSurface, text: colors.danger },
};

export default function ConfidenceBadge({ type = "estimated", label }) {
  const config = CONFIG[type] || CONFIG.estimated;
  return <View style={[styles.badge, { backgroundColor: config.background }]}><View style={[styles.dot, { backgroundColor: config.text }]} /><Text style={[styles.text, { color: config.text }]}>{label || config.label}</Text></View>;
}

const styles = StyleSheet.create({ badge: { alignSelf: "flex-start", minHeight: 24, borderRadius: radius.full, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5 }, dot: { width: 6, height: 6, borderRadius: 3 }, text: { fontSize: 10, fontWeight: "900", letterSpacing: 0.2 } });
