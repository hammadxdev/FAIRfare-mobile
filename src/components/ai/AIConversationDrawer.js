import React, { useEffect, useRef } from "react";
import { Animated, FlatList, Modal, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "../LogoMark";
import colors, { radius, shadow, spacing } from "../../constants/colors";
import AIConversationRow from "./AIConversationRow";
import ConversationListSkeleton from "../skeleton/ConversationListSkeleton";

export default function AIConversationDrawer({ visible, conversations, activeId, deletingId, editingId, editText, editError, renameSaving, loading, onClose, onNewChat, onSelect, onMenu, onEditText, onSaveRename, onCancelRename, onRetry }) {
  const insets = useSafeAreaInsets(); const slide = useRef(new Animated.Value(-390)).current; const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) { slide.setValue(-390); fade.setValue(0); Animated.parallel([Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 220, mass: 0.8, useNativeDriver: true }), Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true })]).start(); } }, [visible, slide, fade]);
  if (!visible) return null;
  const pinned = conversations.filter((item) => item.isPinned); const recent = conversations.filter((item) => !item.isPinned);
  const data = [{ type: "brand" }, { type: "new" }, { type: "heading" }, ...(pinned.length ? [{ type: "section", title: "Pinned" }] : []), ...pinned.map((item) => ({ type: "conversation", item })), ...(recent.length ? [{ type: "section", title: "Recent" }] : []), ...recent.map((item) => ({ type: "conversation", item }))];
  return <Modal transparent visible animationType="none" onRequestClose={onClose}><View style={styles.overlay}><Animated.View style={[styles.scrim, { opacity: fade }]}><TouchableOpacity accessibilityLabel="Close drawer" style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} /></Animated.View><Animated.View style={[styles.drawer, { transform: [{ translateX: slide }], paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}><FlatList data={data} keyExtractor={(item, index) => item.item ? `conversation-${item.item.id}` : `${item.type}-${index}`} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} renderItem={({ item }) => {
    if (item.type === "brand") return <View style={styles.brand}><LogoMark size={38} /><View><Text style={styles.brandName}>FareRide</Text><Text style={styles.brandSub}>Ride smarter, together.</Text></View><TouchableOpacity accessibilityLabel="Close drawer" onPress={onClose} style={styles.close}><Text style={styles.closeIcon}>×</Text></TouchableOpacity></View>;
    if (item.type === "new") return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Start a new chat" onPress={onNewChat} style={styles.newChat}><View style={styles.newIconCircle}><Text style={styles.newIcon}>✦</Text></View><View><Text style={styles.newText}>New Chat</Text><Text style={styles.newSub}>Start a fresh ride conversation</Text></View></TouchableOpacity>;
    if (item.type === "heading") return <Text style={styles.heading}>AI Conversations</Text>;
    if (item.type === "section") return <Text style={styles.section}>{item.title}</Text>;
    return <AIConversationRow conversation={item.item} selected={activeId === item.item.id} deleting={deletingId === item.item.id} editing={editingId === item.item.id} editText={editText} editError={editError} saving={renameSaving} onEditText={onEditText} onSave={onSaveRename} onCancel={onCancelRename} onPress={() => onSelect(item.item.id)} onMenu={onMenu} />;
  }} ListFooterComponent={loading ? <ConversationListSkeleton /> : conversations.length === 0 ? <View><Text style={styles.status}>No saved conversations yet.</Text><TouchableOpacity onPress={onRetry}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : null} /></Animated.View></View></Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, .42)" },
  drawer: { width: "86%", maxWidth: 390, backgroundColor: colors.surfaceContainer, borderTopRightRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", ...shadow },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  brand: { minHeight: 68, flexDirection: "row", alignItems: "center", marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  brandName: { color: colors.forest, fontSize: 18, fontWeight: "900", marginLeft: 10 },
  brandSub: { color: colors.muted, fontSize: 11, marginLeft: 10, marginTop: 2 },
  close: { marginLeft: "auto", width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 28, color: colors.muted },
  newChat: { minHeight: 56, borderRadius: radius.md, backgroundColor: colors.forest, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.lg, shadowColor: "#0F172A", shadowOpacity: .12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  newIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center", marginRight: 11 },
  newIcon: { color: colors.white, fontSize: 18, fontWeight: "900" },
  newText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  newSub: { color: "rgba(255,255,255,.75)", fontSize: 10, marginTop: 2 },
  heading: { color: colors.primary, fontSize: 19, fontWeight: "900", marginBottom: spacing.sm },
  section: { color: colors.forest, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2, fontWeight: "900", marginTop: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  status: { color: colors.muted, textAlign: "center", paddingVertical: spacing.lg },
  retry: { color: colors.forest, fontWeight: "800", textAlign: "center", paddingVertical: spacing.sm },
});
