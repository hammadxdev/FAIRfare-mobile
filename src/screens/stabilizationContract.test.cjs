const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (relative) => fs.readFileSync(path.join(__dirname, relative), "utf8");
test("active authentication is a unified email OTP flow with no password controls",()=>{
 const login=read("LoginScreen.js"); const root=read("../navigation/RootNavigator.js");
 assert.match(login,/Continue with email/); assert.match(login,/Send verification code/); assert.match(login,/Verify and continue/);
 assert.doesNotMatch(login,/password|sign in|create account/i);
 assert.match(root,/name="Auth" component=\{LoginScreen\}/); assert.doesNotMatch(root,/RegisterScreen|ForgotPasswordScreen|VerifyEmailScreen/);
 assert.match(read("NameSetupScreen.js"),/updateProfile/);
});
test("important location and OTP inputs retain readable placeholders",()=>{assert.match(read("../components/LocationInput.js"),/placeholderTextColor=\{colors\.muted\}/);assert.match(read("../components/OtpInput.js"),/placeholderTextColor=\{colors\.muted\}/);});
test("production compare errors cannot use the hardcoded fare fallback",()=>{const home=read("HomeScreen.js");assert.doesNotMatch(home,/allowDevMockFallback/);assert.doesNotMatch(home,/ENABLE_MOCK_FALLBACK &&/);assert.match(home,/Unable to compare fares/);});
