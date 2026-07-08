import React, { forwardRef } from "react";
import { View, Text, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

// Suggestions no longer render here — they're centralized in
// SuggestionsOverlay (see HomeScreen.js) to avoid stacking issues between
// sibling inputs and react-native-maps on native. This component just
// forwards a ref to its input box so the parent can measure its on-screen
// position to anchor that overlay, and reports focus/blur upward.
const LocationInput = forwardRef(function LocationInput(
  { label, placeholder, value, onChangeText, onFocus, onBlur, loading = false, dotColor = null },
  ref
) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap} ref={ref}>
        {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
        <TextInput
          style={[styles.input, dotColor && styles.inputWithDot]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />}
      </View>
    </View>
  );
});

export default LocationInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  inputWrap: {
    justifyContent: "center",
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.xl,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.primary,
  },
  inputWithDot: {
    paddingLeft: spacing.xl,
  },
  dot: {
    position: "absolute",
    left: spacing.md,
    width: 9,
    height: 9,
    borderRadius: 5,
    zIndex: 1,
  },
  spinner: {
    position: "absolute",
    right: spacing.md,
  },
});
