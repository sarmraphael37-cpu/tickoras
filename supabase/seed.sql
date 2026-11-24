-- ============================================================================
-- TICKORA · Seed data
--
-- This seed is safe to run repeatedly. It does not create auth users or demo
-- events: every event must belong to a real, approved organizer. Create your
-- first administrator by signing up normally, then run the promotion snippet
-- documented in README.md (admin bootstrap).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Categories. `icon` values map to src/components/ui/category-icon.tsx.
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, icon, color, sort_order)
values
  ('Concerts', 'concerts', 'Live music, headline shows and intimate acoustic nights.', 'Music', '#3B82F6', 10),
  ('Nightlife', 'nightlife', 'Club nights, DJ sets and late-door experiences.', 'Sparkles', '#1E40AF', 20),
  ('Culture', 'culture', 'Heritage, film, theatre and community storytelling.', 'Palette', '#60A5FA', 30),
  ('Business', 'business', 'Conferences, masterclasses and networking rooms.', 'BriefcaseBusiness', '#1D4ED8', 40),
  ('Sports', 'sports', 'Matches, races and active experiences.', 'Trophy', '#38BDF8', 50),
  ('Food & Drink', 'food-drink', 'Tastings, brunches and chef-led evenings.', 'UtensilsCrossed', '#1D4ED8', 60),
  ('Arts', 'arts', 'Exhibitions, workshops and creative showcases.', 'Palette', '#60A5FA', 70),
  ('Community', 'community', 'Meetups, faith gatherings and civic moments.', 'Users', '#1E40AF', 80),
  ('Technology', 'technology', 'Product launches, hackathons and tech talks.', 'Laptop', '#2563EB', 90)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Platform settings read by the booking engine and dashboards.
-- Values are JSONB; numbers may be stored as JSON numbers.
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, description)
values
  ('service_fee_percent', '5'::jsonb, 'TICKORA service fee as a percentage of the ticket subtotal.'),
  ('min_service_fee', '200'::jsonb, 'Minimum service fee in XAF for paid bookings.'),
  ('reservation_minutes', '15'::jsonb, 'Minutes a booking holds inventory before it expires.'),
  ('payout_minimum', '10000'::jsonb, 'Minimum organizer payout request in XAF.'),
  ('demo_payments_enabled', 'true'::jsonb, 'Whether the clearly-labelled demo payment provider may be used.'),
  ('support_email', '"support@tickora.cm"'::jsonb, 'Public support email address.'),
  ('support_phone', '"+237 000 000 000"'::jsonb, 'Public support phone number (replace before launch).'),
  ('platform_name', '"TICKORA"'::jsonb, 'Public platform name.')
on conflict (key) do nothing;
