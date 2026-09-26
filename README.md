# Comyvo

Comyvo is a campus carpool application for verified Amrita accounts. The application is a Next.js service backed by Supabase Postgres/Auth, with Resend or authenticated SMTP email and Twilio Verify phone verification.

## What is implemented

- Passwordless six-digit email OTP generated and verified by Supabase Auth, delivered through Resend or authenticated SMTP (including Gmail app passwords).
- Server-authorized profile, pool, membership, comment, report, premium, and admin APIs.
- Atomic seat reservation and release in Postgres to prevent overbooking races.
- Row-level security, least-privilege grants, admin audit logs, account suspension, and women-only pool enforcement.
- Durable hashed rate limits, same-origin mutation checks, strict validation, security headers, health check, CI, and zero known production dependency vulnerabilities.
- Resend ride notifications and Twilio Verify phone ownership checks.
- Local-only fixed phone OTP support for development, guarded so it cannot be enabled in production.
- Privacy/terms pages, self-service account deletion, pool lifecycle reconciliation, and administrator user/role controls.

## Local setup

Requirements: Node.js 22+, npm, Docker Desktop, and the Supabase CLI.

```powershell
Copy-Item web/.env.example web/.env.local
npx supabase start
npx supabase db reset
npm ci --prefix web
npm run dev
```

Use the local Supabase output to replace the URL and keys in `web/.env.local`. Open `http://127.0.0.1:3000`. Configure Resend below for real email, including when using the local database. For offline testing, explicitly set `OTP_DELIVERY=supabase`; messages then appear only in the test inbox at `http://127.0.0.1:55424`.

## Real OTP email delivery

### Without a domain: Gmail SMTP

Use a Gmail account with 2-Step Verification enabled. Create an app password at https://myaccount.google.com/apppasswords (some managed school/work accounts do not allow this). Put these values in the ignored `web/.env.local`, using the same Gmail address for `SMTP_USER` and `EMAIL_FROM`:

```dotenv
OTP_DELIVERY=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
EMAIL_FROM=Comyvo <your-account@gmail.com>
```

Restart the app, request an OTP for your college address, and verify the delivered code. Use an app password, never your regular Google password. The connection uses encrypted SMTP; port 587 with mandatory STARTTLS is also supported. Gmail account sending limits still apply, so use a dedicated transactional provider for a wider launch.

### With a verified domain: Resend

1. Create a Resend account at https://resend.com/signup.
2. Add a domain you own at https://resend.com/domains and add the DNS records Resend supplies at your domain's DNS provider. Wait for the domain to show Verified. You cannot use `amrita.edu` as the sender unless you control its DNS; students' college addresses are recipients.
3. Create a sending API key at https://resend.com/api-keys, scoped to your verified domain.
4. Add these values to the ignored `web/.env.local` and later your host's encrypted environment settings:

   ```dotenv
   OTP_DELIVERY=resend
   RESEND_API_KEY=your-real-resend-key
   EMAIL_FROM=Comyvo <login@your-verified-domain.com>
   ```

5. Restart the application and request a code for your own college email. Confirm its delivery in Resend's Emails dashboard and your inbox/spam folder, then verify the code in Comyvo.

Supabase remains responsible for token generation, expiry, and one-time verification; no code is returned to the browser or stored by the application. Provider failures return an error instead of a successful send message. A successful API submission means the provider accepted the email, not proof that the recipient's mail server delivered it. No Supabase SMTP setup is needed with `OTP_DELIVERY=resend`. Resend's test sender is restricted and is not a substitute for a verified sending domain.

Run every quality gate with:

```powershell
npm run check
npm run audit:prod --prefix web
npm run e2e:local --prefix web
```

## Production deployment

1. Create a Supabase project, then link and apply the committed migration:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

2. In Supabase Auth, set the production Site URL and add `https://YOUR_DOMAIN/auth/callback` to redirect URLs. Set email OTP length to six digits and expiry to 10 minutes. Comyvo sends OTPs through Resend directly. If choosing `OTP_DELIVERY=supabase` instead, configure Supabase's custom SMTP and both confirmation and magic-link templates to include `{{ .Token }}`.
3. Verify a sending domain in Resend and create an API key. Create a Twilio Verify Service for SMS verification.
4. Deploy the repository to Vercel with `web` as the Root Directory and configure the required values documented in `web/.env.example` in Production and Preview. Do not set `LOCAL_PHONE_OTP` in deployed environments. Never expose the Supabase secret key, Twilio token, or Resend key through a `NEXT_PUBLIC_` variable.
5. After an owner signs in once, bootstrap the first administrator from a trusted machine:

   ```powershell
   npm run bootstrap:admin --prefix web -- owner@amrita.edu
   ```

6. Confirm `https://YOUR_DOMAIN/api/health` returns `{"status":"ok"}`, then test email OTP, phone OTP, pool creation, concurrent seat joins, cancellation email, reporting, and admin review using real accounts.

The local end-to-end command requires the local Supabase stack and Next.js development server to be running with `OTP_DELIVERY=supabase`. It refuses to target non-local URLs, delivers OTP mail through Mailpit, and removes its temporary accounts after completion. Switch back to `OTP_DELIVERY=resend` for real delivery.

Enable Supabase point-in-time recovery or daily backups, Vercel production logs/alerts, Resend webhook monitoring, Twilio spend limits, and DNS SPF/DKIM/DMARC before inviting users. Rotate every secret if it has ever appeared in source control or chat.

## Credentials required for a live deployment

Provide them only through the deployment platform's encrypted environment-variable UI—not in GitHub, source files, screenshots, or chat:

- Production domain.
- Supabase project URL, publishable key, secret key, project reference, and database password/access needed to apply migrations.
- Resend API key and verified sender address.
- Twilio Account SID, Auth Token, and Verify Service SID.
- Vercel project/team access (or connect the GitHub repository yourself and use `web` as its root directory).

## Data model

The authoritative migration is [`supabase/migrations/202607220001_production_baseline.sql`](supabase/migrations/202607220001_production_baseline.sql). `supabase/seed.sql` intentionally contains no real or fake production identities.

## Operational notes

- Service-role access exists only in server modules and is used to enforce controlled response shapes.
- Public profile responses omit email, phone, and gender. Pool phone numbers are returned only under the host's visibility policy.
- Premium is an approval workflow, not a payment system. Do not market it as a paid subscription until a payment provider, webhook verification, refunds, and accounting are implemented.
- `/api/health` checks application-to-database connectivity and returns a non-200 response when unavailable.
