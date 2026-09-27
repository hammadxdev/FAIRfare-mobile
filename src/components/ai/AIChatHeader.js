import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "../LogoMark";
import colors, { radius, spacing } from "../../constants/colors";

function IconButton({ label, icon, onPress, testID }) {
  return <TouchableOpacity testID={testID} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.iconButton} hitSlop={8}>
    <Text style={styles.icon}>{icon}</Text>
  </TouchableOpacity>;
}

export default function AIChatHeader({ onOpenDrawer, onNewChat, contextLabel }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.wrapper}>
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm, minHeight: 72 + insets.top }]}>
      <IconButton label="Open conversations" icon="≡" onPress={onOpenDrawer} testID="open-conversations" />
      <View style={styles.heading}>
        <Text style={styles.title} numberOfLines={1}>AI Ride Assistant</Text>
        <Text style={styles.subtitle} numberOfLines={1}>Grounded in your Fair Fare data</Text>
      </View>
      <IconButton label="New chat" icon="＋" onPress={onNewChat} testID="new-chat" />
    </View>
    {contextLabel ? <View style={styles.contextChip}><View style={styles.contextDot} /><Text style={styles.contextText} numberOfLines={1}>{contextLabel}</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center" },
  iconButton: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  icon: { color: colors.primary, fontSize: 28, lineHeight: 30, fontWeight: "400" },
  heading: { flex: 1, alignItems: "center", paddingHorizontal: spacing.sm },
  title: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  contextChip: { flexDirection: "row", alignItems: "center", alignSelf: "center", maxWidth: "88%", marginBottom: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.softGreen },
  contextDot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.accent, marginRight: 7 },
  contextText: { color: colors.forest, fontSize: 11, fontWeight: "700" },
});
