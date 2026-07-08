import React from "react";
import { Modal, View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from "react-native";
import LocationSuggestionList from "./LocationSuggestionList";
import colors from "../constants/colors";

// A single, centralized suggestions dropdown shared by both the pickup and
// drop-off inputs, floating above everything else. Two problems a per-input
// dropdown can't solve:
//
// 1. Two sibling dropdowns with the same zIndex tie-break by render order —
//    the later one (drop-off) always wins the paint order over the earlier
//    one (pickup), so pickup's floating suggestions get visually cut into
//    by the drop-off input/label sitting right below it.
// 2. On native Android, react-native-maps' MapView renders via a
//    SurfaceView, which is known to ignore normal view stacking (zIndex/
//    elevation) entirely — a plain absolutely-positioned dropdown can end up
//    underneath the map regardless of its zIndex.
//
// On native, `Modal` renders in its own top-level native layer, which is the
// standard fix for #2. On web there is no SurfaceView stacking problem, and
// react-native-web's Modal/portal implementation is known to be fragile
// around toggling/rapid open-close cycles (backdrops getting stuck and
// blocking clicks after close is a recurring bug class across RN modal
// libraries) — that's exactly what was happening here: after selecting a
// suggestion, a stale full-screen node kept intercepting every tap. So on
// web this renders as a plain, very-high-zIndex absolutely positioned
// overlay instead of going through react-native-web's Modal at all.
export default function SuggestionsOverlay({
  visible,
  anchor,
  loading = false,
  suggestions = [],
  statusMessage = null,
  statusType = "empty",
  onSelect,
  onClose,
}) {
  const showSuggestions = visible && !loading && suggestions.length > 0;
  const showStatus = visible && !loading && suggestions.length === 0 && Boolean(statusMessage);
  const rect = anchor || { x: 0, y: 0, width: 0, height: 0 };

  const content = (
    <>
      {/* Tapping anywhere outside the dropdown closes it — but only while
          actually visible, so it can never block taps once closed. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} pointerEvents={visible ? "auto" : "none"} />

      {visible && (
        <View
          pointerEvents="auto"
          style={[
            styles.dropdown,
            {
              top: rect.y + rect.height + 4,
              left: rect.x,
              width: rect.width,
            },
          ]}
        >
          {loading && (
            <View style={styles.stateRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Searching locations...</Text>
            </View>
          )}

          {showSuggestions && (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <LocationSuggestionList suggestions={suggestions} onSelect={onSelect} />
            </ScrollView>
          )}

          {showStatus && (
            <View style={styles.stateRow}>
              <Text style={[styles.statusText, statusType === "error" ? styles.errorText : styles.emptyText]}>
                {statusType === "error" ? `⚠️  ${statusMessage}` : statusMessage}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );

  if (Platform.OS === "web") {
    // No Modal/portal on web: a plain overlay fully unmounts (and stops
    // capturing any clicks) the instant `visible` goes false, with none of
    // react-native-web's portal-lifecycle edge cases.
    if (!visible) return null;
    return (
      <View style={styles.webOverlay} pointerEvents="box-none">
        {content}
      </View>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  dropdown: {
    position: "absolute",
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  scroll: {
    maxHeight: 220,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
  },
  errorText: {
    color: colors.danger,
  },
});
