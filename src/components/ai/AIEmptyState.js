import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import LogoMark from "../LogoMark";
import colors, { radius, spacing } from "../../constants/colors";

export default function AIEmptyState({ prompts, onPrompt }) {
  return <View style={styles.container}><LogoMark size={64} /><Text style={styles.title}>AI Ride Assistant</Text><Text style={styles.subtitle}>Ask me about your current ride options, fares, pickup availability, route duration, or saved preferences.</Text><View style={styles.chips}>{prompts.map((prompt) => <TouchableOpacity key={prompt} style={styles.chip} onPress={() => onPrompt(prompt)}><Text style={styles.chipText}>{prompt}</Text></TouchableOpacity>)}</View></View>;
}
const styles = StyleSheet.create({ container: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }, title: { color: colors.primary, fontSize: 21, fontWeight: "800", marginTop: 14 }, subtitle: { color: colors.muted, textAlign: "center", lineHeight: 20, marginTop: 8, maxWidth: 320 }, chips: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: spacing.lg }, chip: { backgroundColor: colors.softGreen, borderRadius: radius.full, paddingHorizontal: 13, paddingVertical: 10, margin: 4 }, chipText: { color: colors.forest, fontSize: 12, fontWeight: "700" } });
