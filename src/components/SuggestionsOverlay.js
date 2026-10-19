import React from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import LocationSuggestionList from "./LocationSuggestionList";
import colors from "../constants/colors";

// Inline by design: a native Modal/portal above the TextInput can cause
// Android blur/focus churn whenever its contents update. This surface stays
// in the search card, so results update without remounting the input.
export default function SuggestionsOverlay({ visible, loading = false, suggestions = [], statusMessage = null, statusType = "empty", onSelect, onRetry }) {
  if (!visible) return null;
  const showSuggestions = suggestions.length > 0;
  const showStatus = !loading && Boolean(statusMessage) && (statusType === "error" || !showSuggestions);

  return (
    <View style={styles.dropdown} accessibilityLiveRegion="polite">
      {loading ? <View style={styles.stateRow}><ActivityIndicator size="small" color={colors.accent} /><Text style={styles.loadingText}>{showSuggestions ? "Updating results…" : "Searching locations…"}</Text></View> : null}
      {showSuggestions ? <ScrollView style={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="none" showsVerticalScrollIndicator><LocationSuggestionList suggestions={suggestions} onSelect={onSelect} /></ScrollView> : null}
      {showStatus ? <Pressable style={styles.stateRow} onPress={statusType === "error" ? onRetry : undefined} disabled={statusType !== "error" || !onRetry} accessibilityRole={statusType === "error" ? "button" : undefined} accessibilityLabel={statusType === "error" ? `${statusMessage}. Tap to retry` : statusMessage}><Text style={[styles.statusText, statusType === "error" ? styles.errorText : styles.emptyText]}>{statusMessage}</Text>{statusType === "error" && onRetry ? <Text style={styles.retryText}>Tap to retry</Text> : null}</Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: { marginTop: -4, marginBottom: 8, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8, overflow: "hidden" },
  scroll: { maxHeight: 240 },
  stateRow: { alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 16 },
  loadingText: { marginTop: 7, fontSize: 13, fontWeight: "600", color: colors.muted, textAlign: "center" },
  statusText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  emptyText: { color: colors.muted },
  errorText: { color: colors.danger },
  retryText: { color: colors.primary, fontSize: 12, fontWeight: "800", marginTop: 6 },
});
