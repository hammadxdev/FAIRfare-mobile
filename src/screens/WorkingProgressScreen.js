import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AppHeader from "../components/AppHeader";
import colors, { spacing } from "../constants/colors";

export default function WorkingProgressScreen({ title = "Coming Soon" }) {
  return (
    <View style={styles.flex}>
      <AppHeader title={title} subtitle={null} showLogo={false} />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🚧</Text>
        </View>
        <Text style={styles.title}>Working in Progress</Text>
        <Text style={styles.message}>This module will be available in the next version.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xl * 2,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 19,
  },
});
