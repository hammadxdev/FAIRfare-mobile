import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors, { spacing } from "../../constants/colors";

export default function SettingsRow({ icon, title, value, onPress, last }) {
  return <TouchableOpacity accessibilityRole="button" style={[styles.row, last && styles.lastRow]} onPress={onPress} activeOpacity={0.72}>
    <Text style={styles.icon}>{icon}</Text><View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.value}>{value}</Text></View><Text style={styles.chevron}>›</Text>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  row: { minHeight: 72, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 }, icon: { color: colors.forest, fontSize: 21, width: 34, textAlign: "center", marginRight: spacing.sm }, copy: { flex: 1 }, title: { color: colors.primary, fontWeight: "700", fontSize: 15 }, value: { color: colors.muted, fontSize: 13, marginTop: 4 }, chevron: { color: colors.muted, fontSize: 28, fontWeight: "300", marginLeft: spacing.sm },
});
