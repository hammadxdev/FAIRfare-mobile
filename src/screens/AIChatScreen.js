import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import colors, { spacing } from "../constants/colors";
import { askAi, createAiConversation, deleteAiConversation, getAiConversation, listAiConversations, renameAiConversation, updateAiConversation } from "../services/api";
import AIChatHeader from "../components/ai/AIChatHeader";
import AIChatComposer from "../components/ai/AIChatComposer";
import AIConversationDrawer from "../components/ai/AIConversationDrawer";
import AIConversationMenu from "../components/ai/AIConversationMenu";
import AIEmptyState from "../components/ai/AIEmptyState";
import AIMessageBubble from "../components/ai/AIMessageBubble";
import AITypingIndicator from "../components/ai/AITypingIndicator";
import AppToast from "../components/AppToast";

export default function AIChatScreen({ route }) {
  const comparisonId = route?.params?.comparisonId || null;
  const [activeComparisonId, setActiveComparisonId] = useState(comparisonId);
  const [comparisonContextState, setComparisonContextState] = useState(null);
  const contextLabel = comparisonContextState === "current"
    ? "Using current fare comparison"
    : comparisonContextState === "new" ? "New comparison ready"
      : comparisonContextState === "changed" ? "New route — fares not checked yet"
        : comparisonContextState === "clarification" ? "Route needs clarification"
          : comparisonContextState === "unavailable" ? "New route — fares unavailable" : null;
  const [conversations, setConversations] = useState([]); const [active, setActive] = useState(null); const [input, setInput] = useState(""); const [loading, setLoading] = useState(false); const [listLoading, setListLoading] = useState(true); const [drawerOpen, setDrawerOpen] = useState(false); const [menuConversation, setMenuConversation] = useState(null); const [menuAnchor, setMenuAnchor] = useState(null); const [menuMode, setMenuMode] = useState("ACTIONS"); const [deleteError, setDeleteError] = useState(null); const [editingConversationId, setEditingConversationId] = useState(null); const [renameText, setRenameText] = useState(""); const [renameError, setRenameError] = useState(null); const [renameSaving, setRenameSaving] = useState(false); const [deletingId, setDeletingId] = useState(null); const [error, setError] = useState(null); const [toast, setToast] = useState(null); const [composerHeight, setComposerHeight] = useState(0); const listRef = useRef(null);
  const prompts = useMemo(() => activeComparisonId ? ["Which ride is cheapest?", "Can I check pickup availability?", "Should I book now?", "Compare my options"] : ["Which ride is cheapest?", "Can I check pickup availability?", "Should I book now?", "What are my ride preferences?"], [activeComparisonId]);
  const loadList = useCallback(async () => { setListLoading(true); try { const response = await listAiConversations(); setConversations(response.data || []); setError(null); } catch { setError("We couldn't load your conversations."); } finally { setListLoading(false); } }, []);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { setActiveComparisonId(comparisonId); setComparisonContextState(null); }, [comparisonId]);
  const closeDrawer = useCallback(() => { Keyboard.dismiss(); setDrawerOpen(false); setMenuConversation(null); setMenuAnchor(null); setMenuMode("ACTIONS"); setDeleteError(null); }, []);
  const openDrawer = useCallback(() => { Keyboard.dismiss(); setDrawerOpen(true); }, []);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { closeDrawer(); return true; });
    return () => subscription.remove();
  }, [closeDrawer, drawerOpen]);
  const openConversation = useCallback(async (id) => { closeDrawer(); setListLoading(true); try { const response = await getAiConversation(id); setActive(response.data); setError(null); } catch { setError("We couldn't open that conversation. Try again."); } finally { setListLoading(false); } }, [closeDrawer]);
  const newChat = useCallback(async () => { try { const response = await createAiConversation(); setActive(response.data); setConversations((items) => [response.data, ...items.filter((item) => item.id !== response.data.id)]); closeDrawer(); setError(null); } catch { setError("We couldn't start a new chat. Try again."); } }, [closeDrawer]);
  const send = useCallback(async (value = input, retryMessage = null) => {
    const message = String(value || "").trim(); if (!message || loading) return;
    const clientMessageId = retryMessage?.clientMessageId || `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const conversationId = active?.id && !String(active.id).startsWith("local-") ? active.id : undefined;
    if (!retryMessage) { const optimistic = { id: `local-${clientMessageId}`, role: "USER", content: message, clientMessageId, createdAt: new Date().toISOString(), pending: true }; setActive((current) => ({ ...(current || { id: `local-${clientMessageId}`, title: message, isPinned: false }), messages: [...(current?.messages || []), optimistic] })); setInput(""); requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true })); }
    else setActive((current) => current && { ...current, messages: current.messages.map((item) => item.clientMessageId === clientMessageId ? { ...item, pending: true, failed: false } : item) });
    setLoading(true); setError(null);
    try { const response = await askAi(message, activeComparisonId, conversationId, clientMessageId); const decision = response.data.groundingDecision || response.data.context?.groundingDecision; const nextComparisonId = response.data.comparisonId || (decision === "MATCHED_COMPARISON" ? activeComparisonId : null); setActiveComparisonId(nextComparisonId); setComparisonContextState(decision === "MATCHED_COMPARISON" ? "current" : decision === "NEW_COMPARISON_READY" ? "new" : decision === "ROUTE_CHANGED" ? "changed" : decision === "LOCATION_UNRESOLVED" ? "clarification" : decision === "FARES_UNAVAILABLE" ? "unavailable" : null); setActive(response.data.conversation); setConversations((items) => [response.data.conversation, ...items.filter((item) => item.id !== response.data.conversation.id)]); if (response.data.available === false) { setActive((current) => current && { ...current, messages: current.messages.map((item) => item.clientMessageId === clientMessageId ? { ...item, pending: false, failed: true } : item) }); setError("AI Assistant is temporarily unavailable. Please try again."); } requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true })); }
    catch (err) { setActive((current) => current && { ...current, messages: current.messages.map((item) => item.clientMessageId === clientMessageId ? { ...item, pending: false, failed: true } : item) }); if (err.code !== "SESSION_EXPIRED") setError("AI Assistant is temporarily unavailable. Please try again."); }
    finally { setLoading(false); }
  }, [active, activeComparisonId, input, loading]);
  const startRename = useCallback(() => { const target = menuConversation; setMenuConversation(null); setMenuAnchor(null); if (!target) return; setEditingConversationId(target.id); setRenameText(target.title || ""); setRenameError(null); }, [menuConversation]);
  const cancelRename = useCallback(() => { if (!renameSaving) { setEditingConversationId(null); setRenameText(""); setRenameError(null); } }, [renameSaving]);
  const saveRename = useCallback(async () => { const targetId = editingConversationId; const title = renameText.trim(); if (!targetId || renameSaving) return; if (!title) { setRenameError("Title cannot be empty."); return; } setRenameSaving(true); setRenameError(null); try { const response = await renameAiConversation(targetId, title); setConversations((items) => items.map((item) => item.id === targetId ? response.data : item)); setActive((current) => current?.id === targetId ? { ...current, ...response.data } : current); setEditingConversationId(null); setRenameText(""); } catch { setRenameError("We couldn't rename that conversation."); } finally { setRenameSaving(false); } }, [editingConversationId, renameSaving, renameText]);
  const remove = useCallback(() => { if (!menuConversation) return; setDeleteError(null); setMenuMode("DELETE_CONFIRM"); }, [menuConversation]);
  const confirmDelete = useCallback(async () => { const target = menuConversation; if (!target || deletingId) return; setDeletingId(target.id); setDeleteError(null); try { await deleteAiConversation(target.id); setConversations((items) => items.filter((item) => item.id !== target.id)); if (active?.id === target.id) { setActive(null); setInput(""); } setMenuConversation(null); setMenuAnchor(null); setMenuMode("ACTIONS"); setToast({ type: "success", message: "Conversation deleted" }); } catch { setDeleteError("Couldn't delete conversation. Try again."); } finally { setDeletingId(null); } }, [active?.id, deletingId, menuConversation]);
  const pin = useCallback(async () => { const target = menuConversation; if (!target) return; setMenuConversation(null); setMenuAnchor(null); const nextPinned = !target.isPinned; const previous = conversations; setConversations((items) => items.map((item) => item.id === target.id ? { ...item, isPinned: nextPinned } : item)); try { const response = await updateAiConversation(target.id, { isPinned: nextPinned }); setConversations((items) => items.map((item) => item.id === target.id ? response.data : item)); if (active?.id === target.id) setActive((current) => ({ ...current, ...response.data })); } catch { setConversations(previous); setError("We couldn't update that pin. Try again."); } }, [active?.id, conversations, menuConversation]);
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}><AIChatHeader onOpenDrawer={openDrawer} onNewChat={newChat} contextLabel={contextLabel} /><FlatList ref={listRef} style={styles.messages} data={active?.messages || []} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <AIMessageBubble message={item} onRetry={() => send(item.content, item)} />} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.messageContent, composerHeight ? { paddingBottom: Math.min(composerHeight, 140) } : null, !(active?.messages || []).length && styles.emptyContent]} ListEmptyComponent={listLoading && !active ? <Text style={styles.loading}>Loading your assistant…</Text> : <AIEmptyState prompts={prompts} onPrompt={send} />} ListFooterComponent={loading ? <AITypingIndicator /> : error ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dismiss assistant error" style={styles.errorBox} onPress={() => setError(null)}><Text style={styles.error}>{error}</Text><Text style={styles.dismiss}>{error}</Text></TouchableOpacity> : null} /><AIChatComposer value={input} onChangeText={setInput} onSend={() => send()} loading={loading} onLayout={(event) => setComposerHeight(Math.round(event.nativeEvent.layout.height))} /><AIConversationDrawer visible={drawerOpen} conversations={conversations} activeId={active?.id} deletingId={deletingId} editingId={editingConversationId} editText={renameText} editError={renameError} renameSaving={renameSaving} loading={listLoading} onClose={closeDrawer} onNewChat={newChat} onSelect={openConversation} onMenu={(conversation, anchor) => { setMenuConversation(conversation); setMenuAnchor(anchor); setMenuMode("ACTIONS"); setDeleteError(null); }} onEditText={(value) => { setRenameText(value); setRenameError(null); }} onSaveRename={saveRename} onCancelRename={cancelRename} onRetry={loadList} /><AIConversationMenu conversation={menuConversation} anchor={menuAnchor} mode={menuMode} deleteError={deleteError} deleting={Boolean(deletingId)} onClose={() => { if (!deletingId) { setMenuConversation(null); setMenuAnchor(null); setMenuMode("ACTIONS"); setDeleteError(null); } }} onPin={pin} onRename={startRename} onDelete={remove} onConfirmDelete={confirmDelete} /><AppToast visible={Boolean(toast)} message={toast?.message} type={toast?.type} onHide={() => setToast(null)} /></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  messages: { flex: 1 },
  messageContent: { paddingTop: spacing.md, paddingBottom: spacing.sm, flexGrow: 1 },
  emptyContent: { justifyContent: "flex-start", paddingTop: spacing.lg },
  loading: { color: colors.muted, textAlign: "center", padding: spacing.lg },
  errorBox: { alignSelf: "center", maxWidth: "92%", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderRadius: 14, backgroundColor: colors.dangerSurface, borderWidth: 1, borderColor: colors.dangerSoft },
  error: { color: colors.danger, textAlign: "center", fontSize: 12 },
  dismiss: { color: colors.danger, fontSize: 12, fontWeight: "800", marginTop: 4 },
});
