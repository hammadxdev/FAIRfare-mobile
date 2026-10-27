import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import colors, { radius, spacing } from "../../constants/colors";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? `Today · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function AIConversationRow({ conversation, selected, deleting, editing, editText, editError, saving, onEditText, onSave, onCancel, onPress, onMenu }) {
  const inputRef = useRef(null);
  useEffect(() => { if (editing) inputRef.current?.focus?.(); }, [editing]);
  return <View style={[styles.row, selected && styles.selected]}>
    <TouchableOpacity accessibilityRole="button" onPress={editing ? undefined : onPress} disabled={editing} style={styles.main}>
      <View style={styles.chatIcon}><Text style={styles.chatGlyph}>○</Text></View>
      <View style={styles.copy}>{editing ? <TextInput ref={inputRef} value={editText} onChangeText={onEditText} maxLength={60} autoFocus returnKeyType="done" onSubmitEditing={onSave} onKeyPress={(event) => { if (event.nativeEvent.key === "Escape") onCancel(); }} style={styles.editInput} accessibilityLabel="Conversation title" /> : <Text style={styles.title} numberOfLines={1}>{conversation.title || "New Chat"}</Text>}<Text style={styles.date}>{formatDate(conversation.updatedAt || conversation.createdAt)}</Text>{editError ? <Text style={styles.editError}>{editError}</Text> : null}</View>
      {conversation.isPinned ? <Text accessibilityLabel="Pinned conversation" style={styles.pin}>⌖</Text> : null}
    </TouchableOpacity>
    {editing ? <View style={styles.editActions}><TouchableOpacity accessibilityLabel="Save conversation title" disabled={saving} onPress={onSave} style={styles.editAction}><Text style={styles.saveGlyph}>✓</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Cancel rename" disabled={saving} onPress={onCancel} style={styles.editAction}><Text style={styles.cancelGlyph}>×</Text></TouchableOpacity></View> : <TouchableOpacity accessibilityLabel="Conversation menu" accessibilityRole="button" disabled={deleting} onPress={(event) => onMenu(conversation, event.nativeEvent)} style={styles.menu} hitSlop={8}>{deleting ? <ActivityIndicator size="small" color={colors.forest} /> : <Text style={styles.menuGlyph}>⋮</Text>}</TouchableOpacity>}
  </View>;
}

const styles = StyleSheet.create({ row: { minHeight: 70, marginBottom: 8, borderRadius: radius.md, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "transparent" }, selected: { backgroundColor: colors.softGreen, borderColor: colors.outlineVariant }, main: { flex: 1, minHeight: 70, paddingLeft: spacing.sm, flexDirection: "row", alignItems: "center" }, chatIcon: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center", marginRight: 10 }, chatGlyph: { color: colors.forest, fontSize: 22, lineHeight: 22 }, copy: { flex: 1, minWidth: 0 }, title: { color: colors.primary, fontSize: 14, fontWeight: "800" }, editInput: { height: 36, paddingHorizontal: 10, paddingVertical: 0, borderWidth: 1, borderColor: colors.forest, borderRadius: radius.sm, color: colors.primary, fontSize: 14, fontWeight: "700", outlineStyle: "none" }, date: { color: colors.muted, fontSize: 11, marginTop: 4 }, editError: { color: colors.danger, fontSize: 10, marginTop: 2 }, pin: { color: colors.forest, fontSize: 16, marginHorizontal: 5 }, menu: { width: 48, height: 56, alignItems: "center", justifyContent: "center", borderRadius: radius.full }, menuGlyph: { color: colors.muted, fontSize: 25, lineHeight: 27 }, editActions: { flexDirection: "row", alignItems: "center", paddingRight: 4 }, editAction: { width: 40, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" }, saveGlyph: { color: colors.forest, fontSize: 20, fontWeight: "900" }, cancelGlyph: { color: colors.muted, fontSize: 24, lineHeight: 24 } });
