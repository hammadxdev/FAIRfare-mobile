import React from "react";
import { Platform, Share, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import LogoMark from "../LogoMark";
import colors, { radius, spacing } from "../../constants/colors";

function inlineParts(text) {
  return String(text).split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g).filter(Boolean).map((part, index) => {
    const bold = /^\*\*|^__/.test(part); const italic = !bold && (/^\*|^_/.test(part));
    return <Text key={`${part}-${index}`} style={[bold && styles.bold, italic && styles.italic]}>{part.replace(/^\*\*|\*\*$|^__|__$|^\*|\*$|^_|_$/g, "")}</Text>;
  });
}

function Markdown({ content, user }) {
  const lines = String(content || "").split(/\r?\n/); const output = []; let list = [];
  const flush = () => { if (list.length) { output.push(<View key={`list-${output.length}`} style={styles.list}>{list.map((line, i) => <View key={`${line.text}-${i}`} style={styles.listRow}><Text style={styles.bullet}>{line.ordered ? `${i + 1}.` : "•"}</Text><Text style={[styles.body, user && styles.userText]}>{inlineParts(line.text)}</Text></View>)}</View>); list = []; } };
  lines.forEach((line, index) => { const match = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/); if (match) { list.push({ text: match[2], ordered: Boolean(match[1]) }); return; } flush(); if (line.includes("|") && line.split("|").length >= 3) { if (/^\s*[|:\-\s]+$/.test(line)) return; const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean); output.push(<View key={`table-${index}`} style={styles.tableRow}><Text style={[styles.body, user && styles.userText]}>{cells.map((cell, cellIndex) => <Text key={`${cell}-${cellIndex}`}>{cellIndex ? `  ·  ${cell}` : cell}</Text>)}</Text></View>); return; } if (!line.trim()) output.push(<View key={`space-${index}`} style={styles.space} />); else output.push(<Text key={`line-${index}`} style={[styles.body, user && styles.userText]}>{inlineParts(line)}</Text>); }); flush();
  return <View>{output}</View>;
}

async function copyText(text) {
  if (Platform.OS === "web" && globalThis.navigator?.clipboard) return globalThis.navigator.clipboard.writeText(String(text));
  return Share.share({ message: String(text) });
}

export default function AIMessageBubble({ message }) {
  const user = message.role === "USER";
  return <View style={[styles.messageRow, user && styles.userRow]}>{!user ? <LogoMark size={26} style={styles.avatar} /> : null}<View style={[styles.column, user && styles.userColumn]}><View style={[styles.bubble, user ? styles.userBubble : styles.assistantBubble]}><Markdown content={message.content} user={user} /></View><View style={[styles.meta, user && styles.userMeta]}><Text style={styles.time}>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</Text>{!user ? <TouchableOpacity accessibilityLabel="Copy message" onPress={() => copyText(message.content)}><Text style={styles.action}>Copy</Text></TouchableOpacity> : null}</View></View></View>;
}

const styles = StyleSheet.create({ messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 18, paddingHorizontal: spacing.md }, userRow: { justifyContent: "flex-end" }, avatar: { marginRight: 8, marginBottom: 22 }, column: { maxWidth: "84%" }, userColumn: { alignItems: "flex-end" }, bubble: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: radius.lg }, userBubble: { backgroundColor: colors.forest, borderBottomRightRadius: 6 }, assistantBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 }, body: { color: colors.primary, fontSize: 15, lineHeight: 22 }, userText: { color: colors.white }, bold: { fontWeight: "800" }, italic: { fontStyle: "italic" }, list: { marginTop: 2 }, listRow: { flexDirection: "row", paddingLeft: 2, marginBottom: 5 }, bullet: { color: colors.accent, width: 23, fontWeight: "800" }, tableRow: { paddingVertical: 6, paddingHorizontal: 8, marginTop: 3, borderRadius: 8, backgroundColor: colors.softGreen }, space: { height: 7 }, meta: { flexDirection: "row", alignItems: "center", marginTop: 5, paddingHorizontal: 3 }, userMeta: { justifyContent: "flex-end" }, time: { color: colors.muted, fontSize: 10 }, action: { color: colors.forest, fontSize: 11, fontWeight: "800", marginLeft: 12, paddingVertical: 4 } });
