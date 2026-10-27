import React, { useEffect } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

export default function AppToast({ visible, message, type = "success", onHide, duration = 2200 }) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return undefined;
    Animated.spring(opacity, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => { Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => finished && onHide?.()); }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onHide, opacity]);
  if (!visible) return null;
  const isError = type === "error";
  return <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onHide}><View pointerEvents="box-none" style={styles.layer}><Animated.View accessible accessibilityLiveRegion="polite" style={[styles.toast, isError && styles.errorToast, { opacity }]}><View style={[styles.icon, isError && styles.errorIcon]}><Text style={styles.iconText}>{isError ? "!" : "✓"}</Text></View><Text style={styles.message}>{message}</Text></Animated.View></View></Modal>;
}

const styles = StyleSheet.create({ layer: { flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl, paddingHorizontal: spacing.lg }, toast: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.onPrimaryContainer, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, shadowColor: "#000", shadowOpacity: .18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12 }, errorToast: { backgroundColor: colors.danger }, icon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center", marginRight: spacing.sm }, errorIcon: { backgroundColor: "rgba(255,255,255,.2)" }, iconText: { color: colors.onPrimaryContainer, fontWeight: "900", fontSize: 15 }, message: { flex: 1, color: colors.white, fontSize: 13, fontWeight: "800" } });
