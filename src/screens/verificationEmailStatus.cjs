const DELIVERY_FAILURE_MESSAGE = "Account created, but verification email could not be sent. Please try Resend Code.";
const DELIVERY_FAILURE_RETRY_MESSAGE = "We couldn't send the verification email. Please try again.";

function verificationEmailWasSent(registration) {
  return registration?.verificationEmailSent !== false;
}

module.exports = {
  DELIVERY_FAILURE_MESSAGE,
  DELIVERY_FAILURE_RETRY_MESSAGE,
  verificationEmailWasSent,
};
