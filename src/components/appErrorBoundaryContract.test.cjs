const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const app = fs.readFileSync(path.join(root, "App.js"), "utf8");
const boundary = fs.readFileSync(path.join(root, "src/components/AppErrorBoundary.js"), "utf8");

test("app uses a reusable error boundary with a recovery action", () => {
  assert.match(app, /AppErrorBoundary/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /Try again/);
  assert.match(boundary, /componentStack/);
});
