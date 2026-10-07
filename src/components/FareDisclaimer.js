import React from "react";
import { Text, StyleSheet } from "react-native";
import colors from "../constants/colors";

export const FARE_DISCLAIMER_TEXT = "Estimated fare · Driver offer may vary by PKR 50–100";

export default function FareDisclaimer() {
  return <Text style={styles.text}>{FARE_DISCLAIMER_TEXT}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    maxWidth: 150,
    textAlign: "right",
  },
});
