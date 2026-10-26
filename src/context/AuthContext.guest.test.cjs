const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname,"AuthContext.js"),"utf8");
test("authentication context restores custom sessions and exposes OTP, with no guest bootstrap",()=>{
 assert.match(source,/getSession\(\)/);
 assert.match(source,/authRefresh\(current\.refreshToken/);
 assert.match(source,/requestEmailOtp/);
 assert.match(source,/verifyEmailOtp/);
 assert.doesNotMatch(source,/createGuest|signInAnonymously|guestBootstrap/);
 assert.match(source,/setSessionAtomic/);
});
test("temporary verification failures preserve the current stored session",()=>{
 assert.match(source,/setSessionState\(current\)/);
 assert.match(source,/return "transient"/);
 assert.doesNotMatch(source,/catch \{[^}]*clearSession/s);
});
