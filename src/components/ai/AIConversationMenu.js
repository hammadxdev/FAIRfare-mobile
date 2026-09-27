import React from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, useWindowDimensions, View, StyleSheet } from "react-native";
import colors, { radius, shadow, spacing } from "../../constants/colors";

export default function AIConversationMenu({ conversation, anchor, mode = "ACTIONS", deleteError, deleting, onClose, onPin, onRename, onDelete, onConfirmDelete }) {
  const { width, height } = useWindowDimensions();
  if (!conversation || !anchor) return null;
  const menuWidth = mode === "DELETE_CONFIRM" ? 260 : 190;
  const menuHeight = mode === "DELETE_CONFIRM" ? (deleteError ? 190 : 156) : 190;
  const drawerWidth = Math.min(width * 0.86, 390);
  const left = Math.min(Math.max(anchor.pageX - menuWidth + 34, 12), Math.max(12, drawerWidth - menuWidth - 12));
  const below = anchor.pageY + 12 + menuHeight <= height - 10;
  const top = Math.min(Math.max(below ? anchor.pageY + 10 : anchor.pageY - menuHeight - 8, 10), height - menuHeight - 10);
  const isDeleting = Boolean(deleting);
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
      <View style={[styles.menu, { top, left, width: menuWidth }]} onStartShouldSetResponder={() => true}>
        {mode === "DELETE_CONFIRM" ? <>
          <Text style={styles.confirmTitle}>Delete conversation?</Text>
          <Text style={styles.confirmMessage}>This can't be undone.</Text>
          {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
          <View style={styles.confirmActions}>
            <TouchableOpacity disabled={isDeleting} onPress={onClose} style={styles.confirmButton}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={isDeleting} onPress={onConfirmDelete} style={styles.confirmButton} accessibilityLabel="Confirm delete conversation">
              {isDeleting ? <View style={styles.busy}><ActivityIndicator size="small" color={colors.danger} /><Text style={styles.deleteText}>Deleting...</Text></View> : <Text style={styles.deleteText}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </> : <>
          <Text style={styles.heading} numberOfLines={1}>{conversation.title}</Text>
          <TouchableOpacity style={styles.item} onPress={onPin} accessibilityLabel={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}><Text style={styles.symbol}>Pin</Text><Text style={styles.label}>{conversation.isPinned ? "Unpin" : "Pin"}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={onRename} accessibilityLabel="Rename conversation"><Text style={styles.symbol}>Edit</Text><Text style={styles.label}>Rename</Text></TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={onDelete} accessibilityLabel="Delete conversation"><Text style={[styles.symbol, styles.danger]}>Del</Text><Text style={[styles.label, styles.danger]}>Delete</Text></TouchableOpacity>
        </>}
      </View>
    </TouchableOpacity>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.16)" },
  menu: { position: "absolute", backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: "rgba(15,23,42,.08)", zIndex: 20, elevation: 12, ...shadow },
  heading: { color: colors.muted, fontSize: 11, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  item: { minHeight: 42, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  symbol: { width: 36, color: colors.primary, fontSize: 10, fontWeight: "800" },
  label: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  danger: { color: colors.danger },
  confirmTitle: { color: colors.primary, fontSize: 16, fontWeight: "800", paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  confirmMessage: { color: colors.muted, fontSize: 13, paddingHorizontal: spacing.sm, paddingTop: 5 },
  deleteError: { color: colors.danger, fontSize: 12, paddingHorizontal: spacing.sm, paddingTop: spacing.md },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: spacing.lg, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  confirmButton: { minWidth: 62, minHeight: 34, alignItems: "center", justifyContent: "center" },
  busy: { flexDirection: "row", alignItems: "center", gap: 5 },
  cancel: { color: colors.muted, fontWeight: "700" },
  deleteText: { color: colors.danger, fontWeight: "800" },
});
