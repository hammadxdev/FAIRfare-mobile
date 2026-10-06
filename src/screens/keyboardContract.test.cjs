const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const chat = fs.readFileSync(path.join(root, "src/screens/AIChatScreen.js"), "utf8");
const composer = fs.readFileSync(path.join(root, "src/components/ai/AIChatComposer.js"), "utf8");
const config = fs.readFileSync(path.join(root, "app.config.js"), "utf8");

test("chat keeps a keyboard avoiding container and usable composer", () => {
  assert.match(chat, /KeyboardAvoidingView/);
  assert.match(chat, /behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/);
  assert.match(chat, /<AIChatComposer/);
  assert.match(composer, /multiline/);
  assert.match(composer, /accessibilityLabel="Send message"/);
});

test("Android uses resize mode for keyboard layout", () => {
  assert.match(config, /softwareKeyboardLayoutMode: "resize"/);
});
