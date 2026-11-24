-- ============================================================================
-- TICKORA · 001 · Extensions and enums
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.app_role as enum ('attendee', 'organizer', 'admin', 'scanner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organizer_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum (
    'draft', 'pending_approval', 'published', 'rejected', 'suspended', 'cancelled', 'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum (
    'pending_payment', 'confirmed', 'expired', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('demo', 'mtn_momo', 'orange_money', 'card');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'initiated', 'pending', 'requires_action', 'succeeded', 'failed', 'refunded', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum ('valid', 'used', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.refund_status as enum ('requested', 'approved', 'rejected', 'processed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payout_status as enum ('requested', 'approved', 'processing', 'paid', 'rejected');
exception when duplicate_object then null; end $$;
