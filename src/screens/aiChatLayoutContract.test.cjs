const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const screen = fs.readFileSync(path.join(__dirname, "AIChatScreen.js"), "utf8");
const header = fs.readFileSync(path.join(root, "components/ai/AIChatHeader.js"), "utf8");
const drawer = fs.readFileSync(path.join(root, "components/ai/AIConversationDrawer.js"), "utf8");
const empty = fs.readFileSync(path.join(root, "components/ai/AIEmptyState.js"), "utf8");
const composer = fs.readFileSync(path.join(root, "components/ai/AIChatComposer.js"), "utf8");
const message = fs.readFileSync(path.join(root, "components/ai/AIMessageBubble.js"), "utf8");

test("AI app bar exposes drawer and new-chat actions with compact Material surfaces", () => {
  assert.match(header, /testID="open-conversations"/);
  assert.match(header, /testID="new-chat"/);
  assert.match(header, /AI Ride Assistant/);
  assert.match(header, /surfaceContainer/);
});

test("drawer supports scrim close, Android back close, and real conversation actions", () => {
  assert.match(screen, /Keyboard\.dismiss\(\); setDrawerOpen\(true\)/);
  assert.match(screen, /BackHandler\.addEventListener\("hardwareBackPress"/);
  assert.match(drawer, /onRequestClose=\{onClose\}/);
  assert.match(drawer, /onPress=\{onClose\}/);
  assert.match(drawer, /onNewChat/);
  assert.match(drawer, /onSelect/);
  assert.match(drawer, /onMenu/);
  assert.match(drawer, /Pinned/);
  assert.match(drawer, /Recent/);
  assert.match(drawer, /No saved conversations yet/);
});

test("chat keeps persisted conversation APIs and selected conversation state", () => {
  assert.match(screen, /listAiConversations/);
  assert.match(screen, /createAiConversation/);
  assert.match(screen, /getAiConversation/);
  assert.match(screen, /renameAiConversation/);
  assert.match(screen, /deleteAiConversation/);
  assert.match(screen, /updateAiConversation/);
  assert.match(screen, /activeId=\{active\?\.id\}/);
  assert.match(screen, /response\.data\.conversation/);
});

test("empty state uses compact suggestions with accessible single-tap submission", () => {
  assert.match(empty, /How can I help\?/);
  assert.match(empty, /Ask: \$\{prompt\}/);
  assert.match(empty, /onPress=\{\(\) => onPrompt\(prompt\)\}/);
  assert.match(empty, /width: "48\.5%"/);
  assert.doesNotMatch(empty, /paddingTop: spacing\.xl/);
});

test("composer remains multiline, bounded, and keyboard-safe", () => {
  assert.match(composer, /multiline/);
  assert.match(composer, /maxHeight: 122/);
  assert.match(composer, /useSafeAreaInsets/);
  assert.match(composer, /accessibilityLabel="Send message"/);
  assert.match(screen, /keyboardShouldPersistTaps="handled"/);
  assert.match(screen, /keyboardDismissMode="on-drag"/);
});

test("messages retain distinct user/assistant surfaces and retry behavior", () => {
  assert.match(message, /userBubble/);
  assert.match(message, /assistantBubble/);
  assert.match(message, /message\.failed/);
  assert.match(message, /Retry message/);
  assert.match(message, /message\.pending/);
});

test("suggestions cannot duplicate-submit while the existing send guard is active", () => {
  assert.match(screen, /if \(!message \|\| loading\) return/);
  assert.match(screen, /onPrompt=\{send\}/);
  assert.match(screen, /onSend=\{\(\) => send\(\)\}/);
});
