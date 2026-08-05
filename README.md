# Comyvo

Comyvo is a production-oriented campus carpool application for verified Amrita accounts. The application is a Next.js service backed by Supabase Postgres/Auth, with Resend notifications and Twilio Verify phone verification.

## What is implemented

- Passwordless six-digit email OTP through Supabase Auth; there is no development-code bypass.
- Server-authorized profile, pool, membership, comment, report, premium, and admin APIs.
- Atomic seat reservation and release in Postgres to prevent overbooking races.
- Row-level security, least-privilege grants, admin audit logs, account suspension, and women-only pool enforcement.
- Durable hashed rate limits, same-origin mutation checks, strict validation, security headers, health check, CI, and zero known production dependency vulnerabilities.
- Resend ride notifications and Twilio Verify phone ownership checks.

## Local setup

Requirements: Node.js 22+, npm, Docker Desktop, and the Supabase CLI.

```powershell
Copy-Item web/.env.example web/.env.local
npx supabase start
npx supabase db reset
npm ci --prefix web
npm run dev
```

Use the local Supabase output to replace the URL and keys in `web/.env.local`. Open `http://127.0.0.1:3000`. Local OTP messages can be inspected in the test inbox at `http://127.0.0.1:55424`.

Run every quality gate with:

```powershell
npm run check
npm run audit:prod --prefix web
```

## Production deployment

1. Create a Supabase project, then link and apply the committed migration:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

2. In Supabase Auth, set the production Site URL and add `https://YOUR_DOMAIN/auth/callback` to redirect URLs. Configure custom SMTP using the Resend SMTP credentials so the actual login OTP reaches students. Keep OTP expiry at 10 minutes and disable any provider you do not use.
3. Verify a sending domain in Resend and create an API key. Create a Twilio Verify Service for SMS verification.
4. Deploy the repository to Vercel with `web` as the Root Directory and add every variable from `web/.env.example` to Production and Preview. Never expose the Supabase secret key, Twilio token, or Resend key through a `NEXT_PUBLIC_` variable.
5. After an owner signs in once, bootstrap the first administrator from a trusted machine:

   ```powershell
   npm run bootstrap:admin --prefix web -- owner@amrita.edu
   ```

6. Confirm `https://YOUR_DOMAIN/api/health` returns `{"status":"ok"}`, then test email OTP, phone OTP, pool creation, concurrent seat joins, cancellation email, reporting, and admin review using real accounts.

Enable Supabase point-in-time recovery or daily backups, Vercel production logs/alerts, Resend webhook monitoring, Twilio spend limits, and DNS SPF/DKIM/DMARC before inviting users. Rotate every secret if it has ever appeared in source control or chat.

## Credentials required for a live deployment

Provide them only through the deployment platform's encrypted environment-variable UI—not in GitHub, source files, screenshots, or chat:

- Production domain.
- Supabase project URL, publishable key, secret key, project reference, and database password/access needed to apply migrations.
- Resend API key, verified sender address, and its SMTP credentials for Supabase Auth mail.
- Twilio Account SID, Auth Token, and Verify Service SID.
- Vercel project/team access (or connect the GitHub repository yourself and use `web` as its root directory).

## Data model

The authoritative migration is [`supabase/migrations/202607220001_production_baseline.sql`](supabase/migrations/202607220001_production_baseline.sql). `supabase/seed.sql` intentionally contains no real or fake production identities.

## Operational notes

- Service-role access exists only in server modules and is used to enforce controlled response shapes.
- Public profile responses omit email, phone, and gender. Pool phone numbers are returned only under the host's visibility policy.
- Premium is an approval workflow, not a payment system. Do not market it as a paid subscription until a payment provider, webhook verification, refunds, and accounting are implemented.
- `/api/health` checks application-to-database connectivity and returns a non-200 response when unavailable.
