import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy Notice", description: "How Comyvo collects, uses, and protects account and ride data." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" summary="This notice explains the personal data Comyvo uses to operate a verified campus carpool network.">
      <h2>Information we collect</h2>
      <p>We store your verified institutional email, name, roll number, campus, department, joining year, gender selection, account status, and optional phone number. We also store pools, memberships, comments, reports, premium requests, security audit records, and limited abuse-prevention data.</p>
      <h2>How we use it</h2>
      <p>We use this information to verify eligibility, match riders, reveal contact information according to pool settings, send transactional messages, moderate safety reports, prevent misuse, and maintain the service.</p>
      <h2>Who can see it</h2>
      <p>Other signed-in members see only the profile and ride details needed for the service. Phone numbers follow the visibility choice set by the host. Authorized administrators can access records needed for support, safety, and moderation. Transactional email and phone-verification providers process only the data required to deliver those messages.</p>
      <h2>Retention and deletion</h2>
      <p>We keep account and ride records while needed to provide and secure Comyvo. You can permanently delete your account from Settings. Some minimal audit or legal records may be retained when required for fraud prevention, safety, or law.</p>
      <h2>Security and choices</h2>
      <p>We use access controls, row-level database policies, encrypted transport, one-time-code authentication, rate limiting, and restricted administrative access. You can update your profile, control phone visibility per pool, or request help from the operator identified on the deployed service.</p>
      <h2>Contact</h2>
      <p>For privacy questions or data requests, contact your Comyvo campus administrator. The production operator should publish an active support address before public launch.</p>
    </LegalPage>
  );
}
