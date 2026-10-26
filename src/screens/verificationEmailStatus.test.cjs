const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DELIVERY_FAILURE_MESSAGE, DELIVERY_FAILURE_RETRY_MESSAGE, verificationEmailWasSent } = require("./verificationEmailStatus.cjs");

const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");

test("successful registration preserves the sent-email state", () => {
  assert.equal(verificationEmailWasSent({ verificationEmailSent: true }), true);
  assert.equal(verificationEmailWasSent({}), true);
  assert.match(read("RegisterScreen.js"), /verificationEmailSent: verificationEmailWasSent\(registration\)/);
  assert.match(read("VerifyEmailScreen.js"), /We sent a 6-digit verification code to:/);
});

test("failed registration email is shown without claiming delivery", () => {
  assert.equal(verificationEmailWasSent({ verificationEmailSent: false }), false);
  assert.match(read("VerifyEmailScreen.js"), /DELIVERY_FAILURE_MESSAGE/);
  assert.doesNotMatch(read("VerifyEmailScreen.js"), /verificationEmailSent === false[^\n]*We sent a 6-digit/);
});

test("resend only enters sent state after an accepted response", () => {
  const verify = read("VerifyEmailScreen.js");
  assert.match(verify, /const result = await sendVerificationEmail\(email\)/);
  assert.match(verify, /if \(result\?\.accepted === false\) throw new Error/);
  assert.match(verify, /setVerificationEmailSent\(true\); setCooldown\(Number\(result\?\.cooldownSeconds\) \|\| 60\)/);
  assert.match(verify, /setRemainingResends/);
  assert.match(verify, /setVerificationEmailSent\(false\); setError\(e\.response\?\.data\?\.message \|\| e\.message \|\| DELIVERY_FAILURE_RETRY_MESSAGE\)/);
  assert.match(verify, /EMAIL_OTP_RESEND_LIMIT/);
  assert.match(verify, /remainingResends > 0/);
  assert.equal(DELIVERY_FAILURE_RETRY_MESSAGE, "We couldn't send the verification email. Please try again.");
});
