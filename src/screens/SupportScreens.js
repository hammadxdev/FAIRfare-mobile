import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import colors, { spacing } from "../constants/colors";
import { APP_NAME, APP_VERSION, LEGAL_LAST_UPDATED, SUPPORT_CONTACT } from "../constants/appInfo";

function Document({ title, subtitle, sections }) { return <ScrollView style={styles.flex} contentContainerStyle={styles.content}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>{sections.map(([heading, body]) => <View key={heading} style={styles.section}><Text style={styles.heading}>{heading}</Text><Text style={styles.body}>{body}</Text></View>)}</ScrollView>; }
export function AccountDetailsScreen() { const { user } = useAuth(); return <Document title="Account details" subtitle="Your authenticated Fair Fare account" sections={[["Name", user?.name || "Not available"],["Email", user?.email || "Not available"]]}/>; }
export function AboutScreen() { return <Document title={APP_NAME} subtitle="Ride Smarter" sections={[["What Fair Fare does", "Fair Fare helps users compare ride options from multiple providers in one place so they can understand available fares, pickup estimates and ride categories before continuing to a provider.\n\n• Compares available ride options\n• Shows fare information\n• Shows pickup estimates where available\n• Provides personalized recommendations\n• Offers AI-assisted explanations"],["Important to know", "Fair Fare does not complete ride bookings itself. Users continue to the selected ride provider to complete their booking. Fare estimates and availability may change, and provider-specific fare semantics may differ."],["App information", `Version ${APP_VERSION}`]]}/>; }
export function TermsScreen() { return <Document title="Terms & Conditions" subtitle={`Last updated: ${LEGAL_LAST_UPDATED}`} sections={[
  ["1. Acceptance of Terms", "Your use of Fair Fare is subject to these terms. By using the application, you acknowledge that you have read and understood them."],
  ["2. Service Description", "Fair Fare is a ride comparison and decision-support application. It may display ride-provider options, fare estimates or recommended fares, pickup estimates, ride categories, and AI-assisted explanations or recommendations. Fair Fare does not itself operate the rides shown."],
  ["3. Ride Provider Services", "Bookings are completed through third-party ride providers. The provider's own terms, pricing, availability, and booking conditions apply when you continue to that provider. Fair Fare does not control provider services."],
  ["4. Fare Information", "Displayed fares may be estimates, recommended fares, simulated or demo data, or provider-returned information depending on the data source. A displayed amount is not necessarily a guaranteed final fare. Actual pricing may change."],
  ["5. AI and Recommendation Features", "AI Ride Assistant and personalized recommendations provide decision-support information based on available Fair Fare data. They do not guarantee future prices, availability, pickup time, or provider service quality. Expected Fare is not a guaranteed future fare. WAIT does not guarantee that a fare will decrease later."],
  ["6. User Accounts", "You are responsible for maintaining appropriate access to your account and for activity performed through that access."],
  ["7. Acceptable Use", "Do not misuse the service, interfere with its operation, or attempt unauthorized access."],
  ["8. Third-Party Services", "Fair Fare may rely on third-party mapping, ride-provider, and AI services. Those services may have separate terms."],
  ["9. Availability", "Fair Fare may occasionally be unavailable due to network issues, provider availability, maintenance, or external services."],
  ["10. Limitation / Academic Prototype Notice", "Fair Fare is currently an FYP/prototype application. It is provided for evaluation and decision support and should not be treated as a guarantee of commercial ride outcomes or professional legal advice."],
  ["11. Changes to Terms", "These terms may be updated as the service evolves. The date above indicates the current copy."],
  ["12. Contact", SUPPORT_CONTACT],
]}/>; }
export function PrivacyScreen() { return <Document title="Privacy Policy" subtitle={`Last updated: ${LEGAL_LAST_UPDATED}`} sections={[
  ["1. Information associated with an account", "Fair Fare may associate your name, email, and authentication or session-related information with your account."],
  ["2. Ride comparison information", "Fair Fare may process pickup and destination information, route information, comparison results, and provider, category, and fare observations."],
  ["3. Saved Trips and History", "Saved trips and comparison history belong to the authenticated user and are scoped to that user's account."],
  ["4. Preferences", "Fair Fare stores preferences such as preferred vehicle, avoided vehicle types, typical budget, and ride priority."],
  ["5. AI Ride Assistant", "AI queries may use a relevant current comparison, your preferences, your own history, and model or recommendation outputs. The assistant is not intended to access other users' private histories."],
  ["6. Machine Learning Data", "Identity information such as name, email, password, phone, and user ID is not intended to be used as fare-prediction model features. Fare observations can be used for model development or evaluation without using account identity as a model feature."],
  ["7. Third-Party Services", "Fair Fare may use maps and location services, ride providers where applicable, and AI model providers. Those providers may have their own privacy practices and terms."],
  ["8. Data Security", "The application uses controls such as authenticated access and owner-scoped private data where implemented. No online service can promise absolute security."],
  ["9. Data Retention / Deletion", "Fair Fare currently does not provide full account deletion from Settings. Retention and deletion behavior may evolve with the prototype."],
  ["10. Changes to Policy", "This policy may be updated as the service evolves. The date above indicates the current copy."],
  ["11. Contact", SUPPORT_CONTACT],
]}/>; }
export function HelpScreen() { return <Document title="Help & Support" subtitle="A quick guide to using Fair Fare" sections={[
  ["Using Fair Fare", "How fare comparison works\nCompare available ride options, fare information, pickup estimates, and ride categories before continuing to a provider.\n\nHow Saved Trips work\nSaved trips and comparison history are available to the authenticated account that created them.\n\nHow AI Ride Assistant works\nAsk about a current comparison and receive decision-support explanations using relevant Fair Fare data."],
  ["Does Fair Fare book my ride?", "No. Fair Fare helps compare options and then hands off to the selected provider."],
  ["Are displayed fares guaranteed?", "No. Fare semantics depend on the provider or data source and can change."],
  ["What does Expected Fare mean?", "Expected Fare is the model or reference prediction, not a guaranteed future fare."],
  ["What does Wait mean?", "Wait means the current fare is materially above the model reference under Fair Fare's rule. It does not predict or guarantee a future price drop."],
  ["How are recommendations personalized?", "Recommendations use your existing vehicle, budget, and priority preferences."],
]}/>; }
const styles = StyleSheet.create({ flex:{flex:1,backgroundColor:colors.background}, content:{padding:spacing.lg,paddingBottom:spacing.xl*2}, title:{fontSize:25,fontWeight:"800",color:colors.primary}, subtitle:{color:colors.muted,fontSize:13,lineHeight:20,marginTop:spacing.sm,marginBottom:spacing.lg}, section:{marginBottom:spacing.lg}, heading:{color:colors.forest,fontWeight:"800",fontSize:16,marginBottom:spacing.sm}, body:{color:colors.primary,fontSize:15,lineHeight:24} });
