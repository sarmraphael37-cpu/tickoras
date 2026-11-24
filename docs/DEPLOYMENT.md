# Deployment checklist

## 1. Environment

Set every value in the hosting platform's environment settings (never in source
control):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_SITE_URL` (production HTTPS URL)
- `CRON_SECRET` (random, long, server-only)
- `PAYMENT_WEBHOOK_SECRET` (only when a real provider is implemented)
- `DEMO_PAYMENTS_ENABLED=false` in production unless you explicitly want a
  labelled demo checkout

Add the callback URL `<SITE_URL>/auth/callback` to Supabase Auth's allowed
redirect URLs. Add your production domain to the Supabase Auth site URL settings.

## 2. Database

```bash
supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

Then run `supabase/seed.sql` once to create the default categories and platform
settings. Confirm in the Supabase dashboard that every public table shows
"RLS enabled" and that the three reporting views exist.

Promote an administrator with the SQL in the README, sign in, then approve at
least one organizer from `/admin/approvals`.

## 3. Storage

`20260101000400_storage.sql` creates the `event-media` and `profile-avatars`
buckets with public read and owner-only write policies. Verify the bucket names
match `NEXT_PUBLIC_SUPABASE_URL` storage settings in production.

## 4. Cron

Schedule a request every 5 minutes:

```bash
curl -X POST https://YOUR_DOMAIN/api/cron/expire-reservations \
  -H "Authorization: Bearer $CRON_SECRET"
```

On Vercel, use a cron job pointing at that route and add `CRON_SECRET` as a
project secret. Confirm the response contains an `expired` count.

## 5. Webhooks

Only configure a provider webhook after implementing its adapter, credentials
and signature verification. Point the provider at
`https://YOUR_DOMAIN/api/payments/webhook/[provider]` and use
`PAYMENT_WEBHOOK_SECRET` to sign the raw body with HMAC-SHA256 as `sha256=<hex>`.
Send a unique `x-webhook-event-id` header for idempotency. Until then the route
returns `503` by design.

## 6. Post-deploy verification

1. Register an attendee and confirm email (if confirmation is enabled).
2. Register an organizer, approve it as admin, submit an event, approve the event.
3. Reserve tickets, pay with the labelled demo provider, and inspect the QR ticket.
4. Assign a scanner from the organizer dashboard, open `/scanner`, check in the
   ticket, then attempt a second scan and confirm it is rejected.
5. Request and review a refund, request and settle a payout.
6. Inspect `/admin/audit` to confirm each administrative action was recorded.
7. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` in CI.

## 7. Known limitations

- Real payment providers, automated payouts and provider-side refunds are not
  implemented. Do not accept real money through this build.
- The public sample catalogue is for development only; it disappears when
  Supabase is configured.
- Email delivery is delegated to Supabase Auth; transactional templates should
  be customised before launch.
