import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { radius } from "../constants/colors";
import colors from "../constants/colors";

const TYPE_STYLES = {
  cheapest: { bg: "#DCFCE7", fg: "#15803D" },
  fastest: { bg: "#FEF3C7", fg: "#B45309" },
  recommended: { bg: colors.navy, fg: colors.white },
  default: { bg: colors.border, fg: colors.muted },
};

export default function Badge({ label, type = "default" }) {
  const palette = TYPE_STYLES[type] || TYPE_STYLES.default;

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
