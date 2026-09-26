import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms for using the Comyvo campus carpool service." };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" summary="Comyvo helps verified students coordinate carpools. It is a coordination platform, not a transport operator.">
      <h2>Eligibility and accounts</h2>
      <p>You must use your own eligible institutional email, provide accurate profile information, keep your account secure, and follow campus rules and applicable law. Accounts may not be shared or impersonate another person.</p>
      <h2>Ride arrangements</h2>
      <p>Hosts and riders make ride, fare, timing, luggage, and pickup arrangements directly. Comyvo does not employ drivers, inspect vehicles, process fares, guarantee attendance, or provide insurance. Confirm important details before travelling.</p>
      <h2>Safety</h2>
      <p>Use sound judgment, meet in appropriate locations, and report suspicious or abusive behaviour. Comyvo is not an emergency service. Contact local emergency services or campus security when immediate help is needed.</p>
      <h2>Acceptable use</h2>
      <p>Do not harass others, post misleading rides, misuse personal information, evade restrictions, probe the service, automate abusive traffic, or use Comyvo for unlawful or commercial transport activity. Women-only pool settings must be respected.</p>
      <h2>Moderation and termination</h2>
      <p>Administrators may review reports, remove content, suspend accounts, or restrict access to protect users and the service. You may delete your account from Settings; hosted pools will be cancelled.</p>
      <h2>Availability and responsibility</h2>
      <p>The service is provided on an as-available basis. To the extent permitted by law, the operator is not responsible for user conduct, missed rides, payment disputes, property loss, injury, or indirect damages arising from independently arranged travel.</p>
      <h2>Changes</h2>
      <p>These terms may be updated as the service evolves. Material changes should be communicated through the service. Continuing to use Comyvo after an update means you accept the revised terms.</p>
    </LegalPage>
  );
}
