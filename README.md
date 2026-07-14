# Comyvo

Comyvo is a full-stack campus carpool app for verified Amrita students. It includes:

- Amrita-email OTP sign-in with server-side sessions
- student profiles and women-only pool privacy
- live pool search, publishing, joining, leaving, and cancellation
- masked contact details that unlock according to membership and premium rules
- persistent SQLite storage
- reporting and a protected moderation console

## Run locally

Comyvo requires Node.js 24 or newer and has no third-party runtime dependencies.

```powershell
npm.cmd start
```

Open <http://localhost:3000>. The start command automatically loads an optional `.env` file. If email delivery is not configured, the verification code is clearly marked as a local-only code in the UI and logged by the server. Data is stored in `data/comyvo.db`.

Run the test suite with:

```powershell
npm.cmd test
```

## Production configuration

Copy `.env.example` values into your deployment environment. Environment files are intentionally not loaded by the app itself; use your host's secret manager or environment configuration.

- `DATABASE_PATH`: writable path for the SQLite database
- `APP_ORIGIN`: exact public origin used for same-origin mutation checks
- `OTP_SECRET`: long random secret used to hash OTP codes
- `RESEND_API_KEY` and `MAIL_FROM`: verification email delivery. `MAIL_FROM` must use a sender/domain verified in your Resend account.
- `ADMIN_EMAILS`: comma-separated Amrita email addresses that should receive admin access after verification

Use `NODE_ENV=production` behind HTTPS. Production starts with an empty database and never exposes verification codes in API responses.
