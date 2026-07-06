# 48-Hour Remote Work Challenge

Production-ready public challenge page built with Next.js App Router, TypeScript, Supabase, Stripe Checkout, and PayPal REST capture.

## Challenge Page Setup

### 1. Create the Supabase table

Run the SQL migration in `supabase/migrations/20260706220000_create_challenge_payments.sql` in Supabase SQL Editor or through your Supabase migration flow.

The public browser never writes to Supabase. Server routes use `SUPABASE_SERVICE_ROLE_KEY`, and `/api/challenge/progress` returns only sanitized anonymous data.

### 2. Add environment variables

Copy `.env.example` to `.env.local` for local development and add matching variables in Vercel.

Required for the page shell:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CHALLENGE_END_AT=2026-07-08T20:00:00+02:00
NEXT_PUBLIC_CHALLENGE_GOAL_EUR=500
NEXT_PUBLIC_YOUTUBE_LIVE_ID=
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
```

Required for PayPal:

```bash
PAYPAL_ENV=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
```

Required for Firebase Auth:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
```

### 3. Configure Stripe Checkout

Create a Stripe account and use a secret key in `STRIPE_SECRET_KEY`. The app creates Checkout Sessions dynamically from server-side package mapping:

- `quick_task`: EUR 25.00
- `website_task`: EUR 50.00
- `mvp_consultation`: EUR 100.00

The frontend sends only `packageId`; the server chooses price and currency.

### 4. Configure Stripe webhook

Add a webhook endpoint:

```text
POST {NEXT_PUBLIC_SITE_URL}/api/stripe/webhook
```

Subscribe to:

```text
checkout.session.completed
```

Set the signing secret as `STRIPE_WEBHOOK_SECRET`. The webhook verifies the signature and inserts confirmed EUR payments idempotently.

### 5. Configure PayPal sandbox/live

Create REST app credentials in PayPal Developer Dashboard. Use sandbox credentials with:

```bash
PAYPAL_ENV=sandbox
```

Use live credentials with:

```bash
PAYPAL_ENV=live
```

The browser SDK uses only `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Order creation and capture happen server-side through `/api/paypal/create-order` and `/api/paypal/capture-order`.

### 6. Add YouTube Live ID

Set only the video/live ID:

```bash
NEXT_PUBLIC_YOUTUBE_LIVE_ID=YOUR_VIDEO_ID
```

The page renders `https://www.youtube.com/embed/{NEXT_PUBLIC_YOUTUBE_LIVE_ID}`. If missing, it shows a polished placeholder.

### 7. Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/challenge
```

### 8. Deploy on Vercel

Push the repository, import it in Vercel, add all required environment variables, and deploy. Set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

### 9. Test the timer

Set `NEXT_PUBLIC_CHALLENGE_END_AT` to a near-future ISO timestamp, restart `npm run dev`, and verify that the countdown updates every second. Set it to a past timestamp to verify `Challenge finished`.

### 10. Test progress manually

Insert a test row into Supabase:

```sql
insert into challenge_payments (
  provider,
  provider_payment_id,
  amount_cents,
  currency,
  amount_eur_cents,
  status,
  package_id,
  public_note
) values (
  'stripe',
  'manual-test-1',
  5000,
  'EUR',
  5000,
  'confirmed',
  'website_task',
  'Website task'
);
```

Then call:

```bash
curl http://localhost:3000/api/challenge/progress
```

### 11. Test Stripe webhook locally

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the returned signing secret into `STRIPE_WEBHOOK_SECRET`, then complete a test Checkout Session from `/challenge`.

### 12. Test PayPal sandbox

Use sandbox buyer and merchant accounts from PayPal Developer Dashboard. Add sandbox REST app credentials, open `/challenge`, and complete the PayPal button flow. Confirm that the captured payment appears once in `/api/challenge/progress`.

### 13. Configure Firebase Auth

Fastest stable setup:

1. Create a Firebase project on the free Spark plan.
2. Add a Web app in Firebase Project Settings.
3. Copy the web config into the `NEXT_PUBLIC_FIREBASE_*` environment variables.
4. In Firebase Console, open Authentication > Sign-in method.
5. Enable Email/Password.
6. Enable Google.
7. Enable Facebook.
8. Add the Vercel domain to Authentication > Settings > Authorized domains:

```text
remote-work-challenge.vercel.app
```

For Facebook login, create a Meta app and copy the Facebook App ID/App Secret into the Firebase Facebook provider screen. Firebase will show the OAuth redirect URI that must be added in the Meta app settings.

The app includes `/login` with:

- Google sign-in
- Facebook sign-in
- Email/password sign-in
- Email/password account creation
- Password reset email
- Signed-in user state and sign-out

## Security Notes

- Secret keys are server-only.
- Package IDs are validated server-side.
- Prices are never accepted from the frontend.
- Stripe webhook signatures are verified.
- PayPal capture is server-side.
- Confirmed payments are inserted idempotently.
- Public API responses do not include IDs, names, emails, provider payment IDs, or raw provider payloads.
- Client data, private chats, payment dashboards, and secret keys should never be shown on stream.
