import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import colors from "../constants/colors";

// assets/logo/logo.png ships with a generated placeholder mark so this
// require always resolves. Drop real artwork in at the same path/filename
// to replace it later — no code changes needed.
let logoImage = null;
try {
  logoImage = require("../../assets/logo/logo.png");
} catch (e) {
  logoImage = null;
}

export default function LogoMark({ size = 64, style }) {
  const dimensionStyle = { width: size, height: size };

  if (logoImage) {
    // The real logo is its own shape (a map pin), not a circle — "contain"
    // so it's never stretched or cropped, no forced circular clip.
    return <Image source={logoImage} style={[dimensionStyle, style]} resizeMode="contain" />;
  }

  return (
    <View style={[styles.mark, dimensionStyle, { borderRadius: size / 2 }, style]}>
      <Text style={[styles.markText, { fontSize: size * 0.36 }]}>Ff</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: colors.accent,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
