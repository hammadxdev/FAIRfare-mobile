import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import LogoMark from "../LogoMark";
import colors, { radius, spacing } from "../../constants/colors";

export default function AIEmptyState({ prompts, onPrompt }) {
  const icons = ["₨", "⇄", "⌖", "☆"];
  return <View style={styles.container}><View style={styles.brandRow}><LogoMark size={42} /><View><Text style={styles.eyebrow}>FareRide AI</Text><Text style={styles.title}>How can I help?</Text></View></View><Text style={styles.subtitle}>Ask about your fare comparison, route context, or saved ride preferences.</Text><View style={styles.chips}>{prompts.map((prompt, index) => <TouchableOpacity key={prompt} accessibilityRole="button" accessibilityLabel={`Ask: ${prompt}`} style={styles.chip} onPress={() => onPrompt(prompt)} activeOpacity={0.78}><Text style={styles.chipIcon}>{icons[index % icons.length]}</Text><Text style={styles.chipText} numberOfLines={2}>{prompt}</Text></TouchableOpacity>)}</View></View>;
}
const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  eyebrow: { color: colors.forest, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginLeft: spacing.sm, textTransform: "uppercase" },
  title: { color: colors.primary, fontSize: 22, fontWeight: "900", marginLeft: spacing.sm, marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, maxWidth: 340, marginBottom: spacing.md },
  chips: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  chip: { width: "48.5%", minHeight: 58, flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceContainer, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  chipIcon: { width: 26, height: 26, borderRadius: radius.full, backgroundColor: colors.paleGreen, color: colors.forest, textAlign: "center", lineHeight: 26, fontSize: 15, fontWeight: "900", marginRight: spacing.xs },
  chipText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 16, fontWeight: "700" },
});
