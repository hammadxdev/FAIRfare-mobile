import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function PickupMapAdjuster({ visible, mode = "pickup", onCancel }) {
  if (!visible) return null;
  return <Modal visible transparent onRequestClose={onCancel}><View style={styles.backdrop}><View style={styles.card}><Text style={styles.title}>Map {mode === "destination" ? "destination" : "pickup"} adjustment is available on Android.</Text><TouchableOpacity onPress={onCancel}><Text style={styles.close}>Close</Text></TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(15,23,42,.45)" }, card: { backgroundColor: "white", padding: 24, borderRadius: 16 }, title: { fontSize: 16, fontWeight: "700" }, close: { marginTop: 18, color: "#0F766E", fontWeight: "800" } });
