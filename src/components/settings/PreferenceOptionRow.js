import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors, { radius, spacing } from "../../constants/colors";

export default function PreferenceOptionRow({ label, selected, checkbox, onPress }) {
  return <TouchableOpacity style={[styles.row, selected && styles.selected]} onPress={onPress} activeOpacity={0.72}><View style={checkbox ? [styles.checkbox, selected && styles.checkboxSelected] : [styles.radio, selected && styles.radioSelected]}>{selected ? (checkbox ? <Text style={styles.check}>✓</Text> : <View style={styles.dot}/>) : null}</View><Text style={styles.label}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm }, selected: { backgroundColor: colors.softGreen }, label: { color: colors.primary, fontSize: 15, fontWeight: "600", marginLeft: spacing.md }, radio: { width: 22, height: 22, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, radioSelected: { borderColor: colors.accent }, dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.accent, color: colors.accent, overflow: "hidden" }, checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, check: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
