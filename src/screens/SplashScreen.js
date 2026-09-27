import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import LogoMark from "../components/LogoMark";
import colors, { spacing } from "../constants/colors";

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
    };
  }, [opacity, translateY, scale]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity, transform: [{ translateY }, { scale }] },
        ]}
      >
        <View style={styles.logoRing}>
          <LogoMark size={100} />
        </View>
        <Text style={styles.title}>Fair Fare</Text>
        <Text style={styles.tagline}>Ride Smarter</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  logoRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    // Solid white backdrop, not a translucent tint — the logo's own strokes
    // are navy and would nearly vanish against the dark splash background.
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    marginTop: spacing.lg,
    fontSize: 30,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: "#CBD5E1",
  },
});
