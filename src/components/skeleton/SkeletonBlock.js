import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import colors from "../../constants/colors";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then((value) => { if (mounted) setReduced(Boolean(value)); });
    const subscription = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduced);
    return () => { mounted = false; subscription?.remove?.(); };
  }, []);
  return reduced;
}

export default function SkeletonBlock({ width = "100%", height = 16, borderRadius = 8, style, animated = true }) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (!animated || reducedMotion) { opacity.stopAnimation(); opacity.setValue(0.55); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.95, duration: 900, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); opacity.stopAnimation(); };
  }, [animated, reducedMotion, opacity]);
  return <Animated.View accessible={false} style={[styles.block, { width, height, borderRadius, opacity }, style]} />;
}

const styles = StyleSheet.create({ block: { backgroundColor: colors.border } });
