const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (relative) => fs.readFileSync(path.join(__dirname, relative), "utf8");

test("important inputs expose release-safe labels or readable placeholders", () => {
  const login = read("LoginScreen.js");
  const register = read("RegisterScreen.js");
  const forgot = read("ForgotPasswordScreen.js");
  const location = read("../components/LocationInput.js");
  const otp = read("../components/OtpInput.js");
  assert.match(login, /Email address/);
  assert.match(login, /Password/);
  assert.match(register, /Email address/);
  assert.match(forgot, /Email address/);
  assert.match(location, /placeholderTextColor=\{colors\.muted\}/);
  assert.match(otp, /placeholderTextColor=\{colors\.muted\}/);
});

test("production compare errors cannot use the hardcoded fare fallback", () => {
  const home = read("HomeScreen.js");
  assert.match(home, /allowDevMockFallback/);
  assert.match(home, /ENABLE_MOCK_FALLBACK &&/);
});
