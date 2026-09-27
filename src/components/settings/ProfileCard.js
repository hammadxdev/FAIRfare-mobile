import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors, { radius, shadow, spacing } from "../../constants/colors";

export default function ProfileCard({ name, email, onPress }) {
  const initial = name?.trim().charAt(0).toUpperCase() || "F";
  return <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}><View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View><View style={styles.copy}><Text style={styles.name}>{name || "Fair Fare user"}</Text><Text style={styles.email}>{email || ""}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", ...shadow }, avatar: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center", marginRight: spacing.md }, avatarText: { color: colors.forest, fontSize: 21, fontWeight: "800" }, copy: { flex: 1 }, name: { color: colors.primary, fontWeight: "800", fontSize: 16 }, email: { color: colors.muted, fontSize: 13, marginTop: 4 }, chevron: { color: colors.muted, fontSize: 28, fontWeight: "300" },
});
