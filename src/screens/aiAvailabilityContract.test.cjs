const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const screen = fs.readFileSync(path.join(__dirname, "AIChatScreen.js"), "utf8");
const api = fs.readFileSync(path.join(__dirname, "../services/api.js"), "utf8");
const typing = fs.readFileSync(path.join(__dirname, "../components/ai/AITypingIndicator.js"), "utf8");

test("AI unavailable responses clear loading and leave a retryable composer", () => {
  assert.match(screen, /response\.data\.available === false/);
  assert.match(screen, /AI Assistant is temporarily unavailable\. Please try again\./);
  assert.match(screen, /finally \{ setLoading\(false\); \}/);
  assert.match(screen, /askAi\(message, activeComparisonId, conversationId, clientMessageId\)/);
});

test("AI chat sends the user query only to the assistant endpoint", () => {
  const askAiSource = api.slice(api.indexOf("export async function askAi"), api.indexOf("export async function checkHealth"));
  assert.match(askAiSource, /"\/ai\/chat"/);
  assert.match(askAiSource, /message,/);
  assert.match(askAiSource, /clientMessageId/);
  assert.doesNotMatch(askAiSource, /\/providers\//);
  assert.doesNotMatch(screen, /getIndrive|getYango|getBykea|\/providers\//);
});

test("AI chat waits visibly and renders only a valid final server conversation", () => {
  assert.match(typing, /Understanding your request/);
  assert.match(typing, /Checking routes and available provider quotes/);
  assert.match(typing, /Still waiting for verified results/);
  assert.match(typing, /accessibilityLiveRegion="polite"/);
  assert.match(screen, /response\.data\.conversation/);
  assert.match(screen, /Array\.isArray\(completedConversation\.messages\)/);
  assert.match(screen, /setActive\(completedConversation\)/);
});
