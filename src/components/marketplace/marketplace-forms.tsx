"use client";

import { useActionState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import {
  addPortfolioItem,
  createProviderProfile,
  deletePortfolioItem,
  requestServiceBooking,
  submitServiceQuote,
  submitServiceReview,
  transitionServiceBooking,
  updateProviderProfile,
} from "@/app/actions/marketplace";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { LocationPicker } from "@/components/maps/location-picker";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { ServiceBookingStatus } from "@/types/database";

function StateMessages({ state }: { state: ActionState }) {
  if (state.status === "error") return <Alert tone="danger">{state.message}</Alert>;
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function CreateProviderForm({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createProviderProfile,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="business_name">Business or professional name</Label>
        <Input id="business_name" name="business_name" required maxLength={120} />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" maxLength={80} placeholder="e.g. Buea" />
      </div>
      <div>
        <Label htmlFor="phone">Phone / WhatsApp</Label>
        <Input id="phone" name="phone" maxLength={30} placeholder="+237 ..." />
      </div>
      <div>
        <Label htmlFor="description">What do you offer?</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={2000}
          className="min-h-[90px]"
          placeholder="Describe your services, experience and what makes you great."
        />
      </div>
      {categories.length > 0 ? (
        <fieldset>
          <legend className="text-[12px] font-medium text-ink">
            Service categories
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11.5px] text-muted transition has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 has-[:checked]:text-ink"
              >
                <input type="checkbox" name="categories" value={cat.id} className="sr-only" />
                {cat.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <Button type="submit" loading={pending}>
        {pending ? "Creating…" : "Create provider profile"}
      </Button>
      <StateMessages state={state} />
    </form>
  );
}

export function ProviderProfileForm({
  provider,
  categories,
  selectedCategoryIds,
}: {
  provider: {
    businessName: string;
    description: string | null;
    city: string | null;
    coverageAreas: string[];
    phone: string | null;
    whatsapp: string | null;
    startingPriceXaf: number | null;
    yearsExperience: number | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  categories: Array<{ id: string; name: string }>;
  selectedCategoryIds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    updateProviderProfile,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="business_name">Business name</Label>
          <Input id="business_name" name="business_name" required defaultValue={provider.businessName} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={provider.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={provider.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" name="whatsapp" defaultValue={provider.whatsapp ?? ""} />
        </div>
        <div>
          <Label htmlFor="starting_price">Starting price (XAF)</Label>
          <Input id="starting_price" name="starting_price" type="number" min={0} defaultValue={provider.startingPriceXaf ?? ""} />
        </div>
        <div>
          <Label htmlFor="years_experience">Years of experience</Label>
          <Input id="years_experience" name="years_experience" type="number" min={0} max={80} defaultValue={provider.yearsExperience ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="coverage_areas">Coverage areas (comma separated)</Label>
        <Input
          id="coverage_areas"
          name="coverage_areas"
          defaultValue={provider.coverageAreas.join(", ")}
          placeholder="Buea, Limbe, Douala"
        />
        <p className="mt-1 text-[10.5px] text-muted">
          Cities and regions you serve — organizers can find you by coverage, not just your base city.
        </p>
      </div>
      <div>
        <Label>Business location on map (optional)</Label>
        <p className="mb-2 mt-0.5 text-[11px] text-muted">
          Drop a pin so organizers can locate you — coverage areas still matter
          most for discovery.
        </p>
        <LocationPicker
          initialLat={provider.latitude}
          initialLng={provider.longitude}
          includeAddressInput={false}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" maxLength={2000} className="min-h-[100px]" defaultValue={provider.description ?? ""} />
      </div>
      {categories.length > 0 ? (
        <fieldset>
          <legend className="text-[12px] font-medium text-ink">Service categories</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11.5px] text-muted transition has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 has-[:checked]:text-ink"
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={cat.id}
                  defaultChecked={selectedCategoryIds.includes(cat.id)}
                  className="sr-only"
                />
                {cat.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
      <StateMessages state={state} />
    </form>
  );
}

export function PortfolioManager({
  items,
}: {
  items: Array<{ id: string; image_url: string; title: string | null }>;
}) {
  const [state, formAction, pending] = useActionState(
    addPortfolioItem,
    initialActionState,
  );
  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <Input id="image_url" name="image_url" type="url" required placeholder="https://…" />
        </div>
        <div>
          <Label htmlFor="title">Title (optional)</Label>
          <Input id="title" name="title" maxLength={120} />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline" loading={pending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </form>
      <StateMessages state={state} />
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-[12px] text-muted">
          No portfolio items yet. Add image URLs to showcase your work.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image_url} alt={item.title ?? "Portfolio"} className="aspect-[4/3] w-full object-cover" />
              {item.title ? (
                <p className="truncate px-2 py-1.5 text-[10.5px] text-muted">{item.title}</p>
              ) : null}
              <form action={deletePortfolioItem} className="absolute right-1.5 top-1.5">
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="rounded-full bg-forest/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove portfolio item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookingRequestForm({
  providerId,
  providerName,
  events,
}: {
  providerId: string;
  providerName: string;
  events: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    requestServiceBooking,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="provider_id" value={providerId} />
      <div>
        <Label htmlFor="req-title">What do you need?</Label>
        <Input id="req-title" name="title" required maxLength={160} placeholder={`e.g. Photography for ${providerName}`} />
      </div>
      {events.length > 0 ? (
        <div>
          <Label htmlFor="event_id">Link to event (optional)</Label>
          <select
            id="event_id"
            name="event_id"
            className="h-10 w-full rounded-lg border border-line bg-card px-3 text-[12.5px] text-ink"
            defaultValue=""
          >
            <option value="">No specific event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="event_date">Event date</Label>
          <Input id="event_date" name="event_date" type="date" />
        </div>
        <div>
          <Label htmlFor="budget_xaf">Budget (XAF, optional)</Label>
          <Input id="budget_xaf" name="budget_xaf" type="number" min={0} placeholder="e.g. 150000" />
        </div>
      </div>
      <div>
        <Label htmlFor="req-details">Details</Label>
        <Textarea
          id="req-details"
          name="details"
          maxLength={2000}
          className="min-h-[90px]"
          placeholder="Venue, duration, deliverables, timing…"
        />
      </div>
      <Button type="submit" loading={pending}>
        {pending ? "Sending…" : "Send booking request"}
      </Button>
      <StateMessages state={state} />
    </form>
  );
}

export function QuoteForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(
    submitServiceQuote,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div>
          <Label htmlFor={`amount-${bookingId}`}>Quotation (XAF)</Label>
          <Input id={`amount-${bookingId}`} name="amount" type="number" min={0} required />
        </div>
        <div>
          <Label htmlFor={`note-${bookingId}`}>Note (optional)</Label>
          <Input id={`note-${bookingId}`} name="note" maxLength={1000} />
        </div>
      </div>
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Sending…" : "Send quotation"}
      </Button>
      <StateMessages state={state} />
    </form>
  );
}

const TRANSITION_BUTTONS: Record<
  ServiceBookingStatus,
  Array<{ action: string; label: string; who: "organizer" | "provider" | "either" }>
> = {
  pending: [
    { action: "cancel_booking", label: "Cancel", who: "either" },
  ],
  quotation_submitted: [
    { action: "accept_quote", label: "Accept quotation", who: "organizer" },
    { action: "decline_quote", label: "Decline", who: "organizer" },
  ],
  accepted: [
    { action: "confirm_booking", label: "Confirm booking", who: "organizer" },
    { action: "start_work", label: "Start work", who: "provider" },
    { action: "cancel_booking", label: "Cancel", who: "either" },
  ],
  payment_pending: [
    { action: "cancel_booking", label: "Cancel", who: "either" },
  ],
  confirmed: [
    { action: "start_work", label: "Start work", who: "provider" },
    { action: "complete_booking", label: "Mark completed", who: "either" },
    { action: "dispute_booking", label: "Dispute", who: "either" },
    { action: "cancel_booking", label: "Cancel", who: "either" },
  ],
  in_progress: [
    { action: "complete_booking", label: "Mark completed", who: "either" },
    { action: "dispute_booking", label: "Dispute", who: "either" },
    { action: "cancel_booking", label: "Cancel", who: "either" },
  ],
  completed: [],
  cancelled: [],
  disputed: [
    { action: "complete_booking", label: "Resolve as completed", who: "either" },
    { action: "cancel_booking", label: "Cancel booking", who: "either" },
  ],
};

export function ServiceBookingActions({
  bookingId,
  status,
  role,
}: {
  bookingId: string;
  status: ServiceBookingStatus;
  role: "organizer" | "provider";
}) {
  const [state, formAction, pending] = useActionState(
    transitionServiceBooking,
    initialActionState,
  );
  const buttons = (TRANSITION_BUTTONS[status] ?? []).filter(
    (b) => b.who === "either" || b.who === role,
  );
  if (buttons.length === 0) return null;
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      {buttons.map((b) => (
        <Button
          key={b.action}
          type="submit"
          name="action"
          value={b.action}
          size="sm"
          variant={b.action.includes("cancel") || b.action.includes("decline") || b.action.includes("dispute") ? "outline" : "primary"}
          loading={pending}
        >
          {b.label}
        </Button>
      ))}
      <StateMessages state={state} />
    </form>
  );
}

export function ServiceReviewForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(
    submitServiceReview,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div>
        <Label>Rating</Label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} required className="peer sr-only" />
              <Star className="h-6 w-6 text-faint transition peer-checked:text-warning peer-checked:fill-warning" />
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor={`comment-${bookingId}`}>Review (optional)</Label>
        <Textarea id={`comment-${bookingId}`} name="comment" maxLength={2000} className="min-h-[70px]" />
      </div>
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
      <StateMessages state={state} />
    </form>
  );
}

export function ServiceStatusBadge({ status }: { status: ServiceBookingStatus }) {
  const labels: Record<ServiceBookingStatus, { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" | "info" }> = {
    pending: { label: "Pending", tone: "warning" },
    quotation_submitted: { label: "Quotation sent", tone: "info" },
    accepted: { label: "Accepted", tone: "info" },
    payment_pending: { label: "Payment pending", tone: "warning" },
    confirmed: { label: "Confirmed", tone: "brand" },
    in_progress: { label: "In progress", tone: "info" },
    completed: { label: "Completed", tone: "success" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    disputed: { label: "Disputed", tone: "danger" },
  };
  const entry = labels[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
