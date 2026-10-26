import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

export default class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.error("[app] render error", error?.message || error, info?.componentStack || "");
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.title}>FareRide needs a fresh start</Text>
        <Text style={styles.message}>Something unexpected happened. Your account and saved data are safe.</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Try again" style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: spacing.xl },
  title: { color: colors.primary, fontSize: 22, fontWeight: "800", textAlign: "center" },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: spacing.md, maxWidth: 320 },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  buttonText: { color: colors.white, fontWeight: "800" },
});
