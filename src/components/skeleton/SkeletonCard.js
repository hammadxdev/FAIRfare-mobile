import React from "react";
import { View, StyleSheet } from "react-native";
import SkeletonBlock from "./SkeletonBlock";
import colors, { radius, shadow, spacing } from "../../constants/colors";

export default function SkeletonCard({ children, style }) {
  return <View style={[styles.card, style]}>{children || <><SkeletonBlock width="55%" height={18} /><SkeletonBlock width="78%" height={12} style={styles.gap} /><SkeletonBlock width="38%" height={12} style={styles.gap} /></>}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, ...shadow }, gap: { marginTop: spacing.sm } });
