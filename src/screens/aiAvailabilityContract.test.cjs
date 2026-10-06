const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const screen = fs.readFileSync(path.join(__dirname, "AIChatScreen.js"), "utf8");

test("AI unavailable responses clear loading and leave a retryable composer", () => {
  assert.match(screen, /response\.data\.available === false/);
  assert.match(screen, /AI Assistant is temporarily unavailable\. Please try again\./);
  assert.match(screen, /finally \{ setLoading\(false\); \}/);
  assert.match(screen, /askAi\(message, comparisonId, conversationId, clientMessageId\)/);
});
