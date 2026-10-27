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
          <View style={styles.confirmIcon}><Text style={styles.confirmIconText}>!</Text></View><Text style={styles.confirmTitle}>Delete conversation?</Text>
          <Text style={styles.confirmMessage}>This will permanently remove this conversation and its messages. This action cannot be undone.</Text>
          {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
          <View style={styles.confirmActions}>
            <TouchableOpacity disabled={isDeleting} onPress={onClose} style={styles.confirmButton}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={isDeleting} onPress={onConfirmDelete} style={[styles.confirmButton, styles.deleteConfirmButton]} accessibilityLabel="Confirm delete conversation">
              {isDeleting ? <View style={styles.busy}><ActivityIndicator size="small" color={colors.danger} /><Text style={styles.deleteText}>Deleting...</Text></View> : <Text style={styles.deleteText}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </> : <>
          <Text style={styles.heading} numberOfLines={1}>{conversation.title}</Text>
          <TouchableOpacity style={styles.item} onPress={onPin} accessibilityLabel={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}><Text style={styles.symbol}>{conversation.isPinned ? "⌖" : "☆"}</Text><Text style={styles.label}>{conversation.isPinned ? "Unpin" : "Pin"}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={onRename} accessibilityLabel="Rename conversation"><Text style={styles.symbol}>✎</Text><Text style={styles.label}>Rename</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.item, styles.deleteItem]} onPress={onDelete} accessibilityLabel="Delete conversation"><Text style={[styles.symbol, styles.danger]}>⌫</Text><Text style={[styles.label, styles.danger]}>Delete</Text></TouchableOpacity>
        </>}
      </View>
    </TouchableOpacity>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.16)" },
  menu: { position: "absolute", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.outlineVariant, zIndex: 20, elevation: 16, ...shadow },
  heading: { color: colors.primary, fontSize: 13, fontWeight: "900", paddingHorizontal: spacing.sm, paddingVertical: 9, maxWidth: 160 },
  item: { minHeight: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, borderRadius: radius.md, gap: spacing.sm },
  deleteItem: { backgroundColor: colors.dangerSurface, marginTop: 3 },
  symbol: { width: 28, color: colors.forest, fontSize: 18, fontWeight: "900", textAlign: "center" },
  label: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  danger: { color: colors.danger },
  confirmIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.dangerSurface, alignItems: "center", justifyContent: "center", margin: spacing.sm },
  confirmIconText: { color: colors.danger, fontSize: 22, fontWeight: "900" },
  confirmTitle: { color: colors.primary, fontSize: 18, fontWeight: "900", paddingHorizontal: spacing.sm },
  confirmMessage: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, paddingHorizontal: spacing.sm, paddingTop: 7 },
  deleteError: { color: colors.danger, fontSize: 12, paddingHorizontal: spacing.sm, paddingTop: spacing.md },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  confirmButton: { minWidth: 82, minHeight: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  deleteConfirmButton: { backgroundColor: colors.dangerSurface },
  busy: { flexDirection: "row", alignItems: "center", gap: 5 },
  cancel: { color: colors.muted, fontWeight: "700" },
  deleteText: { color: colors.danger, fontWeight: "800" },
});
