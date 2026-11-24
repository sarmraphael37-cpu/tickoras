# TICKORA

Event discovery, booking and ticketing for Cameroon, priced in XAF.

TICKORA is a Next.js App Router application backed by Supabase (Postgres, Auth,
Storage and Row Level Security). It includes a public catalogue, attendee and
organizer dashboards, an approval workflow, a transactional booking engine,
clearly labelled demo payments, and a QR check-in portal for door staff.

> **Status:** the application is feature-complete and passes `typecheck`, `lint`,
> `test` and `build`. Live Supabase verification, migration execution and
> end-to-end payment testing are **not** included here because no Supabase
> credentials or local Postgres/Docker were available. See
> [Verification status](#verification-status).

---

## 1. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS, custom emerald/cream editorial design tokens |
| Database / Auth | Supabase Postgres, Supabase Auth, `@supabase/ssr` |
| File storage | Supabase Storage (`event-media`, `profile-avatars`) |
| Security | RLS on every table, trusted SQL RPCs, server-side pricing |
| Payments | Adapter architecture: demo (labelled), MTN MoMo, Orange Money, card |
| Tests | Vitest |

---

## 2. Local setup

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (or local Supabase via Docker)
- Supabase CLI (`npm i -g supabase`) for migrations

### Steps

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your own Supabase project values. `.env.example`
contains **placeholders only** — do not commit real keys.

```bash
npm run dev
```

Open <http://localhost:3000>.

Without Supabase env vars the app still builds and the public discovery pages
show a **clearly labelled read-only sample catalogue**. Account creation,
checkout and all dashboards explain that Supabase must be configured; they never
fake a successful backend or payment.

---

## 3. Database setup

The SQL is ordered and idempotent where possible:

| Migration | Purpose |
| --- | --- |
| `20260101000000_extensions_and_enums.sql` | Extensions and Postgres enums |
| `20260101000100_core_schema.sql` | Tables, constraints, indexes, triggers |
| `20260101000200_functions.sql` | Trusted RPCs (pricing, reservations, check-in, admin reviews) |
| `20260101000300_rls.sql` | RLS policies, grants, reporting views |
| `20260101000400_storage.sql` | Storage buckets and object policies |
| `20260101000500_function_grants.sql` | EXECUTE grants for RLS helper functions |

Apply to a hosted Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
psql "$DATABASE_URL" -f supabase/seed.sql   # optional sample categories/settings
```

For local development with Docker:

```bash
supabase start
supabase db reset          # applies migrations + seed.sql
```

### Bootstrap an administrator

Create the first account through `/register`, then promote it in the Supabase
SQL editor (replace the email):

```sql
insert into public.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where lower(u.email) = lower('admin@your-domain.com')
on conflict (user_id, role) do nothing;
```

Administrators must then approve organizer applications from `/admin/approvals`.
Organizers can only submit events after their profile is approved. Published
events are read-only to organizers; changes require an admin suspension/review
cycle so ticket buyers are protected.

### First administrator

Registration never grants `admin` — that would be a privilege escalation. To
bootstrap the first administrator:

1. Set `ADMIN_BOOTSTRAP_EMAIL` in `.env.local` to the email of your account.
2. Restart the dev server.
3. Sign in with that account and open `/setup/admin`.
4. Click **Grant administrator access**, then open `/admin`.
5. Clear `ADMIN_BOOTSTRAP_EMAIL` again once setup is complete.

`SUPABASE_SERVICE_ROLE_KEY` must be configured because RLS correctly forbids a
normal user from granting themselves admin. The same page includes the SQL
equivalent for the Supabase SQL editor.

---

## 4. Payment providers

| Provider | Status | Notes |
| --- | --- | --- |
| Demo | Available in development | Must also be enabled by `demo_payments_enabled` in `/admin/settings`; disabled in production unless `DEMO_PAYMENTS_ENABLED=true`. Clearly tagged `DEMO` everywhere and never moves money. |
| MTN MoMo | **Not configured** | Credentials, API contract, signature verification and reconciliation outstanding. |
| Orange Money | **Not configured** | Credentials, API contract, signature verification and reconciliation outstanding. |
| Card | **Not configured** | PCI-compliant provider, credentials and signature verification outstanding. |

The browser never confirms a payment. The server calculates the total, reserves
inventory, and only a trusted RPC can confirm a booking. Demo confirmation is
restricted to non-production or an explicit opt-in flag.

Webhook intake lives at `POST /api/payments/webhook/[provider]`. It returns
`503` for real providers until they are configured; it verifies an HMAC-SHA256
signature and records events idempotently once configured. It deliberately does
not mutate payments or bookings until a provider-specific parser and
reconciliation job are implemented.

---

## 5. Scheduled jobs

Unpaid bookings hold inventory for the configured reservation window (15 minutes
by default). Call the expiry endpoint from a scheduler:

```bash
curl -X POST https://your-domain/api/cron/expire-reservations \
  -H "Authorization: Bearer $CRON_SECRET"
```

Set `CRON_SECRET` in the environment. Without it the route returns `503`. The
route uses the service-role client and releases inventory atomically via
`expire_stale_bookings`.

---

## 6. Routes

- Public: `/`, `/events`, `/events/[slug]`, `/categories`, `/categories/[slug]`,
  `/organizers/[slug]`, `/how-it-works`, `/about`, `/contact`, `/help`, `/terms`,
  `/privacy`. Event times default to Africa/Douala; social links in the footer can
  be set with `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_X_URL`,
  `NEXT_PUBLIC_FACEBOOK_URL` and `NEXT_PUBLIC_LINKEDIN_URL`.
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`,
  `/auth/callback`, `/unauthorized`, `/account-suspended`
- Attendee: `/attendee`, tickets, bookings, checkout, payments, notifications,
  profile, settings (plus the legacy `/attendee/security` shortcut)
- Organizer: `/organizer`, events, bookings, attendees, check-ins, analytics,
  revenue, payouts, staff, notifications, profile, settings
- Admin: `/admin`, approvals, organizers, events, bookings, payments, refunds,
  payouts, users, categories, inbox, audit, settings
- Scanner: `/scanner` (camera QR scanning, manual code entry, event filter)

---

## 7. Security model

- Every table has RLS enabled with role-specific policies.
- Raw QR tokens are **never** granted to the Data API. Owners retrieve them via
  `get_my_ticket_qr`; the database stores only SHA-256 hashes and `check_in_ticket`
  is atomic.
- Pricing, inventory reservation and expiry are server-side SQL functions.
  The client-supplied price is never trusted.
- Admin actions are restricted by `requireAdmin`, trusted RPCs and an append-only
  audit log.
- Role changes, suspensions, refunds and payouts are recorded in `audit_logs`.
- Service-role credentials are server-only and never prefixed with `NEXT_PUBLIC_`.

---

## 8. Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run typecheck   # TypeScript (no emit)
npm run lint        # ESLint
npm test            # Vitest
npm run db:push     # apply migrations to linked Supabase project
npm run db:reset    # local Supabase reset (requires Docker)
```

---

## 9. Verification status

Passed locally:

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm test` — 23 tests across pricing, formatting, ticket hashing, payment
  adapter availability and error mapping
- `npm run build` — production build succeeds

Not verified here (blocked):

- Applying migrations to a live Supabase project — no credentials available
- Auth, booking, payment and check-in end-to-end flows — require a live database
- Real payment provider integrations — all providers are intentionally unconfigured
- Local `supabase db reset` — no Docker/Postgres available in this environment

Before deployment you must: create `.env.local`, run the migrations, seed the
database, promote an administrator, set `CRON_SECRET`, and verify every flow
against your Supabase project. Do not treat the sample catalogue or demo
payments as production data.
