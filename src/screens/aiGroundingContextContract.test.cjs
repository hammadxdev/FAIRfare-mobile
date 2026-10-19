const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const screen = fs.readFileSync(path.join(__dirname, "AIChatScreen.js"), "utf8");

test("AI context label follows the backend grounding decision", () => {
  assert.match(screen, /activeComparisonId/);
  assert.match(screen, /MATCHED_COMPARISON/);
  assert.match(screen, /NEW_COMPARISON_READY/);
  assert.match(screen, /ROUTE_CHANGED/);
  assert.match(screen, /LOCATION_UNRESOLVED/);
  assert.match(screen, /FARES_UNAVAILABLE/);
  assert.match(screen, /New route — fares not checked yet/);
  assert.match(screen, /const nextComparisonId = response\.data\.comparisonId \|\| \(decision === "MATCHED_COMPARISON" \? activeComparisonId : null\)/);
});

test("AI requests use the server-approved active comparison id", () => {
  assert.match(screen, /askAi\(message, activeComparisonId, conversationId, clientMessageId\)/);
  assert.doesNotMatch(screen, /askAi\(message, comparisonId, conversationId, clientMessageId\)/);
});
