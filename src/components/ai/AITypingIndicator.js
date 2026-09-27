import React from "react";
import { Text, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";
export default function AITypingIndicator() { return <View style={styles.row}><Text style={styles.dot}>•</Text><Text style={styles.dot}>•</Text><Text style={styles.dot}>•</Text><Text style={styles.label}>Fair Fare AI is thinking</Text></View>; }
const styles = StyleSheet.create({ row: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", marginLeft: 50, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, dot: { color: colors.accent, fontSize: 20, lineHeight: 13, marginRight: 2 }, label: { color: colors.muted, fontSize: 12, marginLeft: 7 } });
