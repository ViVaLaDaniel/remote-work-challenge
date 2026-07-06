# Trip Fund Sprint / 48-Hour Remote Work Challenge

Production-ready public challenge page built with Next.js App Router, TypeScript, Supabase, Stripe Checkout, PayPal REST capture, Firebase admin auth, and Telegram notifications.

## Challenge Page Setup

### 1. Create the Supabase tables

Run the SQL migration in `supabase/migrations/20260707110000_create_trip_fund_sprint_tables.sql` in Supabase SQL Editor or through your Supabase migration flow.

The public browser never writes to Supabase. Server routes use `SUPABASE_SERVICE_ROLE_KEY`, and `/api/challenge/progress` returns only sanitized anonymous data from completed public payments.

### 2. Add environment variables

Copy `.env.example` to `.env.local` for local development and add matching variables in Vercel.

Required for the page shell:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CHALLENGE_END_AT=2026-07-08T20:00:00+02:00
NEXT_PUBLIC_CHALLENGE_GOAL_EUR=500
CONTACT_EMAIL=you@example.com
```

Required for progress/payment persistence:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Required for Stripe:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# Optional fixed dashboard price IDs. If omitted, the app creates Checkout
# Sessions with server-side price_data from src/lib/packages.ts.
STRIPE_PRICE_QUICK_TASK=
STRIPE_PRICE_WEBSITE_TASK=
STRIPE_PRICE_MVP_CONSULTATION=
```

Required for PayPal:

```bash
PAYPAL_ENV=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Required for Firebase admin auth:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=
ADMIN_ALLOWED_UIDS=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 3. Configure Stripe Checkout

Use a Stripe secret key in `STRIPE_SECRET_KEY`. The app creates Checkout Sessions from the server-side package mapping:

- `25`: EUR 25.00, quick fix / small script
- `50`: EUR 50.00, website / automation task
- `100`: EUR 100.00, MVP / strategy session

The frontend sends only `package` plus the task brief and contact field. The server chooses price and currency, and the checkout text states that this is payment for a concrete digital service, not a donation.

### 4. Configure Stripe webhook

Add a webhook endpoint:

```text
POST {NEXT_PUBLIC_SITE_URL}/api/stripe/webhook
```

Subscribe to:

```text
checkout.session.completed
```

Set the signing secret as `STRIPE_WEBHOOK_SECRET`. The webhook verifies the signature, validates the package amount, and marks the matching pending payment as completed idempotently.

### 5. Configure PayPal sandbox/live

Create REST app credentials in PayPal Developer Dashboard. Use sandbox credentials with:

```bash
PAYPAL_ENV=sandbox
```

Use live credentials with:

```bash
PAYPAL_ENV=live
```

The browser SDK uses only `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Order creation and capture happen server-side through `/api/paypal/create-order` and `/api/paypal/capture-order`. After capture, the server fetches the order again and validates `COMPLETED`, currency, and amount before counting it.

### 6. Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/challenge
```

### 7. Deploy on Vercel

Push the repository, import it in Vercel, add all required environment variables, and deploy. Set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

### 8. Test the timer

Set `NEXT_PUBLIC_CHALLENGE_END_AT` to a near-future ISO timestamp, restart `npm run dev`, and verify that the countdown updates every second. Set it to a past timestamp to verify `Challenge finished`.

### 9. Test progress manually

Insert a test row into Supabase:

```sql
insert into payments (
  provider,
  provider_ref,
  amount_cents,
  currency,
  package,
  status,
  display_label,
  is_public
) values (
  'stripe',
  'manual-test-1',
  5000,
  'eur',
  '50',
  'completed',
  'Anonymous - website task completed',
  true
);
```

Then call:

```bash
curl http://localhost:3000/api/challenge/progress
```

### 10. Test Stripe webhook locally

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the returned signing secret into `STRIPE_WEBHOOK_SECRET`, then complete a test Checkout Session from `/challenge`.

### 11. Test PayPal sandbox

Use sandbox buyer and merchant accounts from PayPal Developer Dashboard. Add sandbox REST app credentials, open `/challenge`, and complete the PayPal button flow. Confirm that the captured payment appears once in `/api/challenge/progress`.

### 12. Configure Firebase admin auth

Fastest stable setup:

1. Create a Firebase project on the free Spark plan.
2. Add a Web app in Firebase Project Settings.
3. Copy the web config into the `NEXT_PUBLIC_FIREBASE_*` environment variables.
4. In Firebase Console, open Authentication > Sign-in method.
5. Enable Email/Password.
6. Enable Google.
7. Add the Vercel domain to Authentication > Settings > Authorized domains:

```text
remote-work-challenge.vercel.app
```

The app includes `/login` with:

- Google sign-in
- Email/password sign-in
- Email/password account creation
- Password reset email
- Signed-in user state and sign-out

`/admin` requires Firebase Admin verification plus `ADMIN_ALLOWED_UIDS`; being signed in is not enough. Generate a Firebase service account JSON, store it as `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`, and set `ADMIN_ALLOWED_UIDS` to the allowed Firebase user UID list separated by commas.

### 13. Configure Telegram notifications

Create a Telegram bot, get the destination chat ID, and set:

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Notifications are fire-and-forget. A failed Telegram send does not block payment confirmation.

## Security Notes

- Secret keys are server-only.
- Package IDs are validated server-side.
- Prices are never accepted from the frontend.
- Stripe webhook signatures are verified.
- PayPal capture is server-side and amount-validated after capture.
- Confirmed payments are inserted idempotently.
- Public API responses do not include IDs, names, emails, provider payment IDs, or raw provider payloads.
- Public updates must not include client names, emails, private messages, task descriptions, payment dashboards, or secret keys.
- Firebase Auth is used only for admin access; public checkout stays guest-friendly.
- `/legal` explains that payments are for concrete digital services, not donations.
