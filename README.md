# Comyvo

**Campus carpooling for the Amrita community.**

Comyvo helps students find people travelling in the same direction, create shared ride pools, reserve seats, and coordinate trip costs. It brings ride discovery, account management, pool discussions, and moderation into one full-stack web application.

[Open Comyvo](https://comyvo.vercel.app) · [Sign in](https://comyvo.vercel.app/login)

> **Current demo mode:** Sign in with an allowed Amrita email address and **123456**. No login email is sent. This does **not** verify email ownership: someone who knows another student's email can access that account. Admin and suspended accounts cannot use this temporary login path. Do not use demo mode for sensitive information or trusted identity checks.

## Contents

- [Features](#features)
- [How the app works](#how-the-app-works)
- [Tech stack](#tech-stack)
- [Architecture and repository](#architecture-and-repository)
- [Run locally](#run-locally)
- [Configuration](#configuration)
- [Authentication and email](#authentication-and-email)
- [Database](#database)
- [API overview](#api-overview)
- [Testing and development](#testing-and-development)
- [Deployment](#deployment)
- [Administration](#administration)
- [Security and limitations](#security-and-limitations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

### Find and share rides

- Discover upcoming pools by origin, destination or stopover, date, campus, and vehicle type.
- Create pools with departure time, route, stopovers, luggage allowance, notes, and contact visibility.
- Choose auto/tuk-tuk, sedan, or SUV with vehicle-specific seat capacities.
- Reserve a passenger seat, leave a pool, and track hosted or joined rides in **My Pools**.
- Edit, cancel, or complete hosted pools, subject to ownership and lifecycle rules.
- Coordinate with hosts and fellow riders through participant-only pool discussions.
- Create and discover women-only pools according to the account's recorded gender and server-side eligibility rules.

### Share trip costs

- **Fixed amount:** Specify a quoted price per person in rupees.
- **Split equally:** Divide the final fare among the people actually travelling, including the host—not unused seats.
- Equal-split rides display “Split equally” rather than a misleading zero or estimated price.
- The app records the pricing arrangement; it does not collect money or settle payments.

### Accounts and moderation

- Amrita email-domain checks and student-email decoding to prefill campus, department, admission year, and roll number where the format is recognized.
- Profile setup, profile editing, contact preferences, and account deletion.
- Optional phone ownership verification through Twilio Verify.
- Reports, account suspension, role management, and an admin dashboard with audit records.
- Premium-access requests reviewed by an administrator; this is an approval workflow, not a paid subscription.
- Email notifications for supported events such as joining or cancelling pools, when a sending provider is configured.

## How the app works

1. **Sign in:** Enter an Amrita email and complete the configured login flow.
2. **Complete your profile:** Supply your name and required student details.
3. **Find or create a pool:** Search an upcoming route or publish your own departure.
4. **Reserve and coordinate:** Choose an available seat and use the pool discussion. Contact visibility follows the host's settings.
5. **Travel and share costs:** Follow the fixed-price or equal-split arrangement. Payments happen outside Comyvo.
6. **Manage the ride:** Hosts can update or cancel pools; participants can leave or report issues.

Email login, even when real OTP delivery is enabled, proves access to a mailbox—not a person's identity, gender, driving ability, or the safety of a ride.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| Styling and icons | Custom CSS and Lucide React |
| Backend | Next.js Route Handlers running on Node.js |
| Database | Supabase PostgreSQL, SQL migrations, functions, triggers, and row-level security |
| Authentication | Supabase Auth with cookie-based sessions via `@supabase/ssr` |
| Input validation | Zod |
| Email | Nodemailer with authenticated SMTP, or the Resend API |
| Optional phone verification | Twilio Verify |
| Tests and code quality | Vitest, ESLint, TypeScript |
| Hosting and CI | Vercel, GitHub, and GitHub Actions |
| Local infrastructure | Docker-backed Supabase and a local email inbox |

Exact dependency versions are recorded in [web/package.json](web/package.json) and [web/package-lock.json](web/package-lock.json). There is no separate Express backend: the frontend and API are part of the same Next.js application.

## Architecture and repository

```text
Browser
   |
   v
Next.js pages and React components
   |
   v
Next.js API routes
   |-- Validation, session checks, permissions, rate limits
   |-- Supabase Auth + PostgreSQL
   |-- SMTP / Resend (email)
   '-- Twilio Verify (optional phone verification)
```

Privileged database credentials stay in server modules. API handlers authorize each operation before using server-side database access; SQL constraints, transactions, and policies provide additional protection.

```text
.
├── README.md
├── package.json                  # Root shortcuts for web scripts
├── .github/workflows/ci.yml      # Automated quality checks
├── deployment/supabase/          # Hosted-auth configuration
├── supabase/
│   ├── config.toml              # Local ports and Auth settings
│   ├── migrations/              # Authoritative, ordered database changes
│   ├── seed.sql
│   └── templates/               # Local authentication email template
├── web/
│   ├── .env.example             # Configuration template; no real credentials
│   ├── scripts/                 # Admin, deployment, and integration utilities
│   ├── public/
│   └── src/
│       ├── app/                 # Pages, layouts, auth callback, API routes
│       ├── components/          # Layout, pool, and UI components
│       ├── lib/                 # Auth, email, validation, pricing, Supabase
│       ├── styles/
│       ├── instrumentation.ts   # Production configuration validation
│       └── proxy.ts             # Session refresh and route redirects
└── sample-frontends/             # Earlier UI prototypes
```

The maintained application is in `web/`. Apply every file in `supabase/migrations/` in order; do not treat the older `supabase/schema.sql` as a replacement for the migration history.

## Run locally

### Prerequisites

- Node.js 22 or newer and npm.
- Git.
- Docker Desktop running, if using the local Supabase stack.
- Supabase CLI, available through `npx supabase`.

Commands below use PowerShell and start in the repository root.

### 1. Install and create your local configuration

```powershell
git clone https://github.com/Zenitsu272/Comyvo.git
cd Comyvo
npm ci --prefix web
Copy-Item web/.env.example web/.env.local
```

Private-repository access may be required. If you already have `web/.env.local`, keep it rather than overwriting your credentials.

### 2. Start the database

```powershell
npx supabase start
npx supabase status
```

Copy the local API URL, publishable/anon key, and secret/service-role key into `web/.env.local`. The app supports both Supabase key naming formats.

For a **new or disposable local database**, you can rebuild it from the migrations:

```powershell
npx supabase db reset --local
```

**This erases local database contents.** Skip it if you need to preserve existing local accounts or rides.

### 3. Select a local login mode

For temporary access without email delivery:

```dotenv
TEMPORARY_LOGIN_ENABLED=true
PHONE_VERIFICATION_ENABLED=false
```

Alternatively, to test genuine OTP delivery to the local inbox:

```dotenv
TEMPORARY_LOGIN_ENABLED=false
OTP_DELIVERY=supabase
PHONE_VERIFICATION_ENABLED=false
```

Use a random `RATE_LIMIT_SECRET`, and set `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`. Keep the remaining required database settings from the template.

### 4. Start the app

```powershell
npm run dev
```

| Local service | Address |
| --- | --- |
| Comyvo | [127.0.0.1:3000](http://127.0.0.1:3000) |
| Supabase API | [127.0.0.1:55421](http://127.0.0.1:55421) |
| PostgreSQL | `127.0.0.1:55422` |
| Supabase Studio | [127.0.0.1:55423](http://127.0.0.1:55423) |
| Local email inbox | [127.0.0.1:55424](http://127.0.0.1:55424) |

Restart the development server after changing authentication or environment settings. To stop the local database services, run `npx supabase stop`.

## Configuration

Use [web/.env.example](web/.env.example) as the configuration reference. Store local values in the ignored `web/.env.local`; set deployed values in your hosting platform's environment settings.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Application origin used for redirects and origin checks |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key; legacy alias: `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | Server-only privileged key; legacy alias: `SUPABASE_SERVICE_ROLE_KEY` |
| `RATE_LIMIT_SECRET` | Secret used when hashing rate-limit identities; at least 32 characters in production |
| `TEMPORARY_LOGIN_ENABLED` | Exactly `true` enables shared-code demo access; otherwise real OTP is used |
| `OTP_DELIVERY` | `resend` (default), `smtp`, or `supabase` |
| `EMAIL_FROM` | Sender address authorized by your email provider |
| `RESEND_API_KEY` | Required for Resend delivery |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server and encrypted port: 465 or 587 |
| `SMTP_USER`, `SMTP_PASSWORD` | SMTP login and SMTP key/app password |
| `PHONE_VERIFICATION_ENABLED` | Exactly `true` enables phone verification; defaults to disabled |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Required when phone verification is enabled |
| `LOCAL_PHONE_OTP` | Optional development-only phone code; rejected in production |
| `ALLOWED_EMAIL_DOMAINS` | Optional additional server-side domain allowlist entries; expanding beyond Amrita also requires reviewing frontend checks and database rules |

Never put private keys in `NEXT_PUBLIC_*` variables. Do not commit environment files, database snapshots, logs, or credentials.

## Authentication and email

### Temporary shared-code mode

With `TEMPORARY_LOGIN_ENABLED=true`, the app accepts an allowed email plus `123456`, sends no login email, and establishes a normal Supabase session. The UI displays a demo warning. Rate limits and account restrictions remain enabled, but the shared code provides **no identity assurance**.

To restore email verification:

1. Set `TEMPORARY_LOGIN_ENABLED=false`.
2. Configure and test a real email sender.
3. Redeploy or restart the application.
4. Revoke sessions created during demo access and review accounts before trusting their ownership.

Changing the flag does not automatically invalidate existing sessions. The flag only bypasses **login email delivery**; other configured notification emails may still be sent.

### Real email OTP

When temporary mode is off, Supabase generates and verifies the login token. The app can deliver that token through SMTP or Resend. Sender failures return an error instead of pretending that an email was sent.

**SMTP example:**

```dotenv
TEMPORARY_LOGIN_ENABLED=false
OTP_DELIVERY=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-login
SMTP_PASSWORD=your-smtp-key
EMAIL_FROM="Comyvo <your-authorized-sender@example.com>"
```

Use the login, SMTP key, and sender approved by your provider—not an arbitrary From address. The SMTP implementation requires TLS. If the provider restricts sending IPs, its policy must accommodate the deployment's outbound network.

**Resend example:**

```dotenv
TEMPORARY_LOGIN_ENABLED=false
OTP_DELIVERY=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="Comyvo <login@your-verified-domain.example>"
```

**Local inbox:** `OTP_DELIVERY=supabase` uses Supabase's email flow. With the local stack, inspect messages in the local inbox; they are not delivered to a real college mailbox.

Use SMTP or Resend for the documented production configuration. The current production environment validator expects credentials for one of these providers; simply selecting hosted Supabase email does not remove that requirement.

The local Auth configuration uses six-digit OTPs with a ten-minute expiry. Match those settings in hosted Supabase. Provider acceptance is not proof of delivery to the recipient's inbox.

### Optional phone verification

The email-only deployment does not require Twilio. Keep `PHONE_VERIFICATION_ENABLED=false` to hide the phone-verification controls and reject phone-OTP requests.

When enabled, phone verification uses Twilio Verify and Indian `+91` phone numbers. `LOCAL_PHONE_OTP` is restricted to a non-production app backed by local Supabase and must never be set on Vercel.

## Database

The database schema is managed by these migrations:

1. [Production baseline](supabase/migrations/202607220001_production_baseline.sql): accounts, pools, memberships, moderation, policies, and core functions.
2. [Integrity and lifecycle](supabase/migrations/202609260001_integrity_and_lifecycle.sql): additional pool integrity and account/lifecycle safeguards.
3. [Pool pricing](supabase/migrations/202609260002_pool_pricing_mode.sql): fixed-price and equal-split modes.

| Entity | Responsibility |
| --- | --- |
| `auth.users` | Supabase-managed authentication identities |
| `public.users` | Application profiles, roles, contact details, and account status |
| `pools` | Routes, departures, capacity, pricing, visibility, and ride status |
| `pool_members` | Passenger membership and seat selection |
| `comments` | Pool discussions |
| `reports` | User-submitted moderation reports |
| `premium_requests` | Premium-access review workflow |
| `audit_logs` | Administrative and selected account actions |
| `api_rate_limits` | Durable rate-limit counters |

SQL functions and triggers reserve and release seats transactionally. Capacity includes the host, so initial passenger availability is `total_seats - 1`. Expired-pool reconciliation runs from relevant pool API operations; it is not a separate always-running worker.

`supabase/seed.sql` does not provide production identities or a preconfigured admin account.

## API overview

API routes are under `web/src/app/api/`. Protected routes require a Supabase session; host, participant, or admin permissions apply as appropriate.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/send-otp` | Start login; send a real OTP or report temporary-code mode |
| POST | `/api/auth/verify-otp` | Validate the configured code and establish a session |
| GET / PUT / DELETE | `/api/me` | Read, update, or delete the current account |
| GET / POST | `/api/pools` | Discover/list pools or create a pool |
| GET / PUT / DELETE | `/api/pools/:id` | Read, edit, or cancel a pool |
| POST | `/api/pools/:id/join` | Reserve a seat |
| DELETE | `/api/pools/:id/leave` | Leave a pool |
| GET / POST | `/api/pools/:id/comments` | Read or add participant discussion messages |
| GET | `/api/users/:id` | Read the permitted public profile |
| POST | `/api/reports` | Submit a report |
| GET / POST | `/api/premium` | View or request premium access |
| GET / POST | `/api/admin/reports` | Admin dashboard data and moderation/review actions |
| POST | `/api/phone/request-otp`, `/api/phone/verify-otp` | Optional phone verification |
| GET | `/api/health` | Application-to-database health |

Pool-list query parameters include `from`, `to`, `date`, `timezone_offset`, `campus`, `car_type`, `women_only`, and `scope=mine`. Payload schemas are defined in [validation.ts](web/src/lib/validation.ts).

## Testing and development

Root-level commands delegate to the Next.js app:

| Command | Action |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve an existing production build |
| `npm run lint` | Run ESLint with zero warnings allowed |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run Vitest |
| `npm run check` | Run lint, typecheck, tests, and build |
| `npm run audit:prod --prefix web` | Audit production dependencies |

Production builds run configuration validation. Use deployment-appropriate environment values; local-only phone bypasses must be removed before a production build.

### Integration tests

These tests create and remove temporary fixtures. Run against disposable local data first.

**Full local flow:** Start local Supabase and the app with `TEMPORARY_LOGIN_ENABLED=false` and `OTP_DELIVERY=supabase`, then run from the repository root:

```powershell
npm run e2e:local --prefix web
```

This test loads `web/.env.local`, refuses remote app/database URLs, and retrieves genuine OTPs from the local inbox.

**Pricing:** With temporary login disabled and local services running:

```powershell
cd web
node --env-file=.env.local scripts/e2e-pricing.mjs
```

**Temporary-code login:** With `TEMPORARY_LOGIN_ENABLED=true` and local services running:

```powershell
cd web
node --env-file=.env.local scripts/e2e-temporary-login.mjs
```

The temporary-login test checks new and existing accounts, session cookies, rejected codes/domains, and blocked admin/suspended accounts. Its production path requires explicit `--confirm-production` and is restricted to this deployment; do not run it casually against live data.

[GitHub Actions](.github/workflows/ci.yml) runs installation, lint, typecheck, unit tests, a production dependency audit, and build on pull requests and pushes to `main`. Live-provider and database integration tests are separate.

## Deployment

The current deployment uses Vercel for the application and hosted Supabase for the database and authentication.

### 1. Prepare hosted Supabase

Create a hosted project, then run from the repository root:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Confirm the linked project before applying migrations. Back up existing production data first. Do not use `db reset` on a hosted production database.

Set Supabase Auth's Site URL to your public application origin and allow `https://YOUR_DOMAIN/auth/callback`. Configure the six-digit email OTP and expiry settings.

### 2. Configure Vercel

- Connect the repository and set the **Root Directory** to `web`.
- Use the Next.js framework preset and a supported Node.js runtime.
- Supply the database keys, site URL, rate-limit secret, and login/email settings from the environment reference.
- Configure Production and Preview separately. Prefer an isolated database for previews.
- Keep `PHONE_VERIFICATION_ENABLED=false` unless SMS verification is deliberately configured.
- For verified-email access, set `TEMPORARY_LOGIN_ENABLED=false` and configure SMTP or Resend.
- Redeploy after changing environment variables. Browser-exposed `NEXT_PUBLIC_*` values are embedded during build.

The `deployment/supabase/config.toml` and `web/scripts/configure-vercel-env.mjs` files are specific to Comyvo's existing deployment. The environment helper reads an ignored `web/.env.production.local`, requires explicit production confirmation, and checks its configured targets. Review it before reusing it for another project; it is not a generic one-command installer.

### 3. Verify the release

- Check `/api/health`: HTTP 200 indicates the app can query its database; failure returns HTTP 503.
- Test the intended login mode, profile completion, creating/joining/leaving/cancelling pools, and permissions.
- For real OTP, confirm actual inbox delivery—not just an API success response.
- Confirm private environment files cannot be downloaded.
- Configure backups, monitoring, and provider limits appropriate to the deployment.

A successful build or health response does not establish that every external provider is configured correctly.

## Administration

Roles are `student`, `premium`, and `admin`. Accounts can be active or suspended.

To bootstrap an admin, first create the account through genuine sign-in. From a trusted machine, load the environment for the intended database and run:

```powershell
cd web
node --env-file=.env.local scripts/bootstrap-admin.mjs owner@amrita.edu
```

Use a securely stored production environment file instead when deliberately targeting production. The script requires an existing auth user and updates that user's application role.

**Temporary shared-code login is blocked for admins.** Disable demo mode and use genuine OTP delivery for admin sign-in. Do not promote an account solely because someone entered its email in demo mode.

## Security and limitations

Implemented controls include session-based authorization, Zod validation, same-origin mutation checks, hashed rate-limit keys, database row-level security, SQL integrity checks, restricted contact disclosure, and audit records.

Important boundaries:

- **Temporary login is intentionally insecure for identity.** It must not be described as verified access or production-safe authentication.
- Some backend operations use a privileged Supabase client. Their API permission checks are essential; RLS alone does not protect those operations.
- Women-only eligibility uses recorded profile data, not independently verified identity.
- The app coordinates carpools; it does not provide driver vetting, insurance, emergency response, GPS tracking, transport-provider booking, or payment processing.
- Pool discussions are not a guarantee of real-time message delivery.
- Disabling temporary login does not revoke existing sessions.
- Optional notification delivery depends on the configured provider and may fail independently of a completed database operation.
- Privacy and terms pages should be reviewed for the actual operator and deployment before wider use.

Keep credentials out of source control, screenshots, and chat. Rotate exposed credentials, restrict administrative access, and review dependencies regularly.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `123456` is rejected | Ensure temporary mode is enabled on the running deployment, redeploy/restart, and confirm the account is not admin or suspended. |
| No login email arrives | Demo mode intentionally sends none. Local Supabase delivers to the local inbox. Otherwise inspect sender configuration and provider delivery logs. |
| Provider rejects a message | Check SMTP/API credentials, approved sender, quotas, and any IP restrictions. Do not assume a “sent” response guarantees inbox delivery. |
| Profile/API calls fail after login | Check session cookies, matching Supabase URL/keys, account status, and whether all migrations were applied. |
| Phone verification is unavailable | It is disabled by default; enable it only with the required Twilio settings. |
| Database health returns 503 | Check database availability, server credentials, and migration state. |
| Integration tests fail in temporary mode | Real-OTP and pricing tests require temporary mode off; use the dedicated temporary-login test for shared-code access. |
| Production build rejects settings | Check required environment variables, rate-limit secret length, email-provider configuration, and forbidden local phone OTP settings. |

## Contributing

1. Make a focused change and preserve existing user data.
2. Add tests for changed behavior, especially authentication, permissions, pricing, and seat allocation.
3. Add a new migration for database changes rather than rewriting already-applied migrations.
4. Run `npm run check` and the relevant local integration tests.
5. Update this README or the environment template when behavior or configuration changes.
6. Never include credentials, local database files, or generated runtime logs in a commit.

No license file is currently included in this repository. Do not assume permission to redistribute it under an open-source license.
