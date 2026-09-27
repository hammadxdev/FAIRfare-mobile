import React from "react";
import { Modal, Text, TouchableOpacity, useWindowDimensions, View, StyleSheet } from "react-native";
import colors, { radius, shadow, spacing } from "../constants/colors";

export default function SavedTripMenu({ item, anchor, onClose, onEdit, onDelete }) {
  const { width, height } = useWindowDimensions();
  if (!item || !anchor) return null;
  const top = Math.min(Math.max(anchor.pageY - 18, 18), height - 135); const right = Math.max(10, width - anchor.pageX - 12);
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}><View style={[styles.menu, { top, right }]} onStartShouldSetResponder={() => true}><TouchableOpacity style={styles.item} onPress={onEdit} accessibilityLabel="Edit saved trip"><Text style={styles.symbol}>✎</Text><Text style={styles.label}>Edit label</Text></TouchableOpacity><TouchableOpacity style={styles.item} onPress={onDelete} accessibilityLabel="Delete saved trip"><Text style={[styles.symbol, styles.danger]}>⌫</Text><Text style={[styles.label, styles.danger]}>Delete</Text></TouchableOpacity></View></TouchableOpacity></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.16)" }, menu: { position: "absolute", width: 160, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xs, ...shadow }, item: { minHeight: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, borderRadius: radius.sm }, symbol: { width: 26, color: colors.primary, fontSize: 18 }, label: { color: colors.primary, fontSize: 14, fontWeight: "700" }, danger: { color: colors.danger } });
