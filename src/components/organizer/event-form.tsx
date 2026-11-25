"use client";

import { useActionState, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  ImageIcon,
  Info,
  MapPin,
  Plus,
  Send,
  Ticket,
  Trash2,
} from "lucide-react";
import { saveEvent } from "@/app/actions/organizer";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { LocationPicker } from "@/components/maps/location-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";
import { CITIES } from "@/lib/domain";
import { cn, formatInputDateTime, formatXAF } from "@/lib/utils";

interface EventDefaults {
  id?: string;
  title: string;
  slug: string;
  categoryId: string;
  description: string;
  shortDescription: string;
  venueName: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  startAt: string;
  endAt: string;
  coverImageUrl: string;
  bannerImageUrl: string;
}

interface TierDefaults {
  id?: string;
  name: string;
  description: string;
  priceXaf: number;
  quantityTotal: number;
  minPerOrder: number;
  maxPerOrder: number;
  salesStartAt: string;
  salesEndAt: string;
  isActive: boolean;
}

interface TierDraft {
  key: string;
  id?: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  min: string;
  max: string;
  salesStart: string;
  salesEnd: string;
  isActive: boolean;
}

const STEPS = [
  { title: "Basics", short: "Details", icon: Info },
  { title: "Media", short: "Media", icon: ImageIcon },
  { title: "Location", short: "Location", icon: MapPin },
  { title: "Date & time", short: "Schedule", icon: CalendarDays },
  { title: "Tickets", short: "Tickets", icon: Ticket },
  { title: "Review", short: "Review", icon: Check },
] as const;

const STEP_FIELDS: Record<number, string[]> = {
  1: ["title", "short_description", "description"],
  2: [],
  3: ["venue_name", "city"],
  4: ["start_at", "end_at"],
  5: [],
  6: [],
};

function newTier(): TierDraft {
  return {
    key: `tier-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    description: "",
    price: "",
    quantity: "",
    min: "1",
    max: "8",
    salesStart: "",
    salesEnd: "",
    isActive: true,
  };
}

function toDraft(tier: TierDefaults): TierDraft {
  return {
    key: tier.id ?? `tier-${Math.random().toString(36).slice(2, 9)}`,
    id: tier.id,
    name: tier.name,
    description: tier.description ?? "",
    price: String(tier.priceXaf ?? ""),
    quantity: String(tier.quantityTotal ?? ""),
    min: String(tier.minPerOrder ?? 1),
    max: String(tier.maxPerOrder ?? 8),
    salesStart: tier.salesStartAt ? formatInputDateTime(tier.salesStartAt) : "",
    salesEnd: tier.salesEndAt ? formatInputDateTime(tier.salesEndAt) : "",
    isActive: tier.isActive,
  };
}

export function EventForm({
  organizerId,
  categories,
  defaults,
  tiers: tierDefaults,
  editable = true,
  wizard = false,
}: {
  organizerId: string;
  categories: Array<{ id: string; name: string }>;
  defaults?: Partial<EventDefaults>;
  tiers?: TierDefaults[];
  editable?: boolean;
  wizard?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveEvent,
    initialActionState,
  );
  const [tiers, setTiers] = useState<TierDraft[]>(
    tierDefaults && tierDefaults.length > 0
      ? tierDefaults.map(toDraft)
      : [newTier()],
  );
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, string> | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const fields = state.fieldErrors ?? {};
  const firstError = (key: string) => fields[key]?.[0];
  const sectionClass = (index: number) =>
    cn("glass-subtle rounded-xl p-5 shadow-card sm:p-6", wizard && step !== index && "hidden");

  function updateTier(key: string, patch: Partial<TierDraft>) {
    setTiers((current) =>
      current.map((tier) => (tier.key === key ? { ...tier, ...patch } : tier)),
    );
  }

  function validateStep(target: number): boolean {
    setValidationError(null);
    const form = formRef.current;
    if (!form) return true;
    const data = new FormData(form);
    for (const key of STEP_FIELDS[target] ?? []) {
      if (!String(data.get(key) ?? "").trim()) {
        setValidationError("Complete the required fields before continuing.");
        return false;
      }
    }
    if (target === 5) {
      if (tiers.length === 0) {
        setValidationError("Add at least one ticket tier.");
        return false;
      }
      if (tiers.some((tier) => !tier.name.trim() || tier.quantity === "" || Number(tier.quantity) < 1)) {
        setValidationError("Every ticket tier needs a name and a quantity of at least one.");
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step === 5) {
      const data = new FormData(formRef.current!);
      setPreview({
        title: String(data.get("title") ?? ""),
        slug: String(data.get("slug") ?? ""),
        city: String(data.get("city") ?? ""),
        venue: String(data.get("venue_name") ?? ""),
        start: String(data.get("start_at") ?? ""),
        end: String(data.get("end_at") ?? ""),
        tiers: `${tiers.length} tier${tiers.length === 1 ? "" : "s"}`,
        capacity: String(tiers.reduce((sum, tier) => sum + Number(tier.quantity || 0), 0)),
      });
    }
    setStep((current) => Math.min(6, current + 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateAll(event: React.MouseEvent<HTMLButtonElement>): boolean {
    if (!wizard) return true;
    for (let index = 1; index <= 5; index += 1) {
      if (!validateStep(index)) {
        setStep(index);
        event.preventDefault();
        return false;
      }
    }
    return true;
  }

  const serialisedTiers = JSON.stringify(
    tiers.map((tier, index) => ({
      id: tier.id ?? "",
      name: tier.name,
      description: tier.description,
      priceXaf: tier.price === "" ? 0 : Number(tier.price),
      quantityTotal: tier.quantity === "" ? 0 : Number(tier.quantity),
      minPerOrder: tier.min === "" ? 1 : Number(tier.min),
      maxPerOrder: tier.max === "" ? 1 : Number(tier.max),
      salesStartAt: tier.salesStart,
      salesEndAt: tier.salesEnd,
      isActive: tier.isActive,
      sortOrder: index + 1,
    })),
  );

  return (
    <div className="space-y-6">
      {wizard ? (
        <div className="glass-subtle rounded-xl p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
                Step {step} of {STEPS.length}
              </p>
              <h2 className="mt-1 text-[16px] font-semibold text-ink">
                {STEPS[step - 1].title}
              </h2>
            </div>
            <span className="text-[11px] text-muted">
              {Math.round((step / STEPS.length) * 100)}% complete
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STEPS.map((item, index) => {
              const number = index + 1;
              const active = number === step;
              const done = number < step;
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10.5px] font-medium transition",
                    active
                      ? "border-brand-500/60 bg-brand-50 text-ice"
                      : done
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-line bg-base text-muted",
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="hidden truncate sm:block">{item.short}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="space-y-6"
      >
        <input type="hidden" name="event_id" value={defaults?.id ?? ""} />
        <input type="hidden" name="ticket_types" value={serialisedTiers} />

        {!editable ? (
          <Alert tone="warning" title="Editing is locked">
            Only drafts and rejected events can be edited. This event is already in
            review or published.
          </Alert>
        ) : null}

        {state.status === "error" ? (
          <Alert tone="danger" title="Could not save this event">
            {state.message}
          </Alert>
        ) : null}
        {state.status === "success" ? (
          <Alert tone="success">{state.message}</Alert>
        ) : null}
        {validationError ? (
          <Alert tone="warning">{validationError}</Alert>
        ) : null}

        <section className={sectionClass(1)}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
              <Info className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Event basics</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                A clear title and short description help attendees find you.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <Label htmlFor="title">Event title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={defaults?.title ?? ""}
                placeholder="e.g. Buea Afrobeats Night"
                maxLength={160}
                required
              />
              <FieldError>{firstError("event.title") ?? firstError("title")}</FieldError>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="slug">URL slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={defaults?.slug ?? ""}
                  placeholder="Generated from the title if left blank"
                  maxLength={80}
                  pattern="[a-z0-9-]*"
                />
                <FieldHint>Lowercase letters, numbers and dashes only.</FieldHint>
                <FieldError>{firstError("event.slug") ?? firstError("slug")}</FieldError>
              </div>
              <div>
                <Label htmlFor="category_id">Category</Label>
                <Select
                  id="category_id"
                  name="category_id"
                  defaultValue={defaults?.categoryId ?? ""}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="short_description">Short description</Label>
              <Input
                id="short_description"
                name="short_description"
                defaultValue={defaults?.shortDescription ?? ""}
                placeholder="One line shown on event cards"
                maxLength={300}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Full description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={defaults?.description ?? ""}
                placeholder="What should attendees expect? Line-up, schedule, entry rules and highlights."
                className="min-h-[180px]"
                maxLength={20000}
                required
              />
              <FieldHint>
                Plain text. Separate paragraphs with a blank line. This appears on the
                public event page.
              </FieldHint>
            </div>
          </div>
        </section>

        <section className={sectionClass(2)}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Event artwork</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                JPG, PNG, WebP or AVIF up to 5 MB. Stored in your private organizer
                folder.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ImageUpload
              bucket="event-media"
              folder={organizerId}
              name="cover_image_url"
              defaultValue={defaults?.coverImageUrl ?? ""}
              label="Cover image"
              hint="Used on event cards. A 4:3 landscape works best."
              previewClassName="aspect-[4/3]"
            />
            <ImageUpload
              bucket="event-media"
              folder={organizerId}
              name="banner_image_url"
              defaultValue={defaults?.bannerImageUrl ?? ""}
              label="Banner image"
              hint="Used at the top of the public event page. A 2.35:1 image is ideal."
              previewClassName="aspect-[16/9]"
            />
          </div>
        </section>

        <section className={sectionClass(3)}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Location</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Where should attendees meet you?
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="venue_name">Venue name</Label>
              <Input
                id="venue_name"
                name="venue_name"
                defaultValue={defaults?.venueName ?? ""}
                placeholder="e.g. Salle des Fêtes, Buea"
                maxLength={200}
                required
              />
              <FieldError>{firstError("event.venueName")}</FieldError>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={defaults?.address ?? ""}
                placeholder="Street, neighbourhood (optional)"
                maxLength={300}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="city">City</Label>
              <Select id="city" name="city" defaultValue={defaults?.city ?? "Buea"} required>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
              <FieldError>{firstError("event.city")}</FieldError>
            </div>
          </div>

          <div className="mt-5">
            <Label>Venue location on map (optional)</Label>
            <p className="mb-2 mt-0.5 text-[11px] text-muted">
              Drop a pin so attendees can find the venue. You can also search an
              address — powered by OpenStreetMap.
            </p>
            <LocationPicker
              initialLat={defaults?.latitude}
              initialLng={defaults?.longitude}
              initialAddress={defaults?.address}
              includeAddressInput={false}
            />
          </div>
        </section>

        <section className={sectionClass(4)}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Date & time</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Times are interpreted in Africa/Douala and stored in UTC.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="start_at">Starts</Label>
              <Input
                id="start_at"
                name="start_at"
                type="datetime-local"
                defaultValue={
                  defaults?.startAt ? formatInputDateTime(defaults.startAt) : ""
                }
                required
              />
              <FieldError>{firstError("event.startAt")}</FieldError>
            </div>
            <div>
              <Label htmlFor="end_at">Ends</Label>
              <Input
                id="end_at"
                name="end_at"
                type="datetime-local"
                defaultValue={
                  defaults?.endAt ? formatInputDateTime(defaults.endAt) : ""
                }
                required
              />
              <FieldError>{firstError("event.endAt")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value="Africa/Douala (WAT)" readOnly disabled />
              <FieldHint>
                TICKORA events are displayed in Cameroon time by default.
              </FieldHint>
            </div>
          </div>
        </section>

        <section className={cn("space-y-4", wizard && step !== 5 && "hidden")}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                <Ticket className="h-4 w-4 text-accent-300" />
                Ticket types
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Prices are set by you in XAF. TICKORA adds a service fee at checkout.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTiers((current) => [...current, newTier()])}
              disabled={tiers.length >= 20}
            >
              <Plus className="h-3.5 w-3.5" />
              Add tier
            </Button>
          </div>

          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <div
                key={tier.key}
                className="glass-subtle rounded-xl p-4 shadow-card sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-accent-200">
                      {index + 1}
                    </span>
                    <p className="text-[12px] font-semibold text-ink">
                      {tier.name || "Untitled tier"}
                    </p>
                    {tier.quantity && tier.price ? (
                      <span className="text-[10.5px] text-muted">
                        {tier.quantity} available ·{" "}
                        {Number(tier.price) === 0
                          ? "Free"
                          : formatXAF(Number(tier.price))}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTiers((current) =>
                        current.filter((item) => item.key !== tier.key),
                      )
                    }
                    disabled={tiers.length === 1}
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-danger hover:underline disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <Label>Tier name</Label>
                    <Input
                      value={tier.name}
                      onChange={(event) =>
                        updateTier(tier.key, { name: event.target.value })
                      }
                      placeholder="Regular, VIP, VVIP, Early Bird or custom"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <Label>Price (XAF)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={tier.price}
                      onChange={(event) =>
                        updateTier(tier.key, { price: event.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={tier.quantity}
                      onChange={(event) =>
                        updateTier(tier.key, { quantity: event.target.value })
                      }
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label>Min per order</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={tier.min}
                      onChange={(event) =>
                        updateTier(tier.key, { min: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Max per order</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={tier.max}
                      onChange={(event) =>
                        updateTier(tier.key, { max: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sales open</Label>
                    <Input
                      type="datetime-local"
                      value={tier.salesStart}
                      onChange={(event) =>
                        updateTier(tier.key, { salesStart: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sales close</Label>
                    <Input
                      type="datetime-local"
                      value={tier.salesEnd}
                      onChange={(event) =>
                        updateTier(tier.key, { salesEnd: event.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Label>Description</Label>
                    <Input
                      value={tier.description}
                      onChange={(event) =>
                        updateTier(tier.key, { description: event.target.value })
                      }
                      placeholder="What is included with this ticket?"
                      maxLength={300}
                    />
                  </div>
                </div>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[11.5px] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={tier.isActive}
                    onChange={(event) =>
                      updateTier(tier.key, { isActive: event.target.checked })
                    }
                    className="h-3.5 w-3.5 rounded border-line accent-brand-600"
                  />
                  Visible and on sale
                </label>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] leading-4 text-muted">
            Removing a tier that already has sales hides it but keeps its history.
            You can raise capacity later, but never below tickets already sold or
            reserved.
          </p>
        </section>

        {wizard ? (
          <section className={cn("glass-subtle rounded-xl p-5 shadow-card sm:p-6", step !== 6 && "hidden")}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Review & finish</h2>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  Check the summary before saving or submitting for approval.
                </p>
              </div>
            </div>
            {preview ? (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Event", preview.title],
                  ["URL slug", preview.slug || "Generated automatically"],
                  ["Location", `${preview.venue} · ${preview.city}`],
                  ["Starts", preview.start.replace("T", " ")],
                  ["Ends", preview.end.replace("T", " ")],
                  ["Ticket setup", `${preview.tiers} · ${preview.capacity} tickets`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-line bg-base p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {label}
                    </dt>
                    <dd className="mt-1 truncate text-[12.5px] font-medium text-ink">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <Alert tone="info" className="mt-5">
              Organizers cannot approve their own events. Submission sends this draft
              to the TICKORA review team.
            </Alert>
          </section>
        ) : null}

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 glass-subtle rounded-xl/95 p-4 shadow-float backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10.5px] leading-4 text-muted sm:max-w-md">
            {wizard
              ? "Your progress stays in this form. You can go back and change any step."
              : "Save a draft to keep working, or submit for TICKORA review. Organizers cannot self-approve."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {wizard && step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValidationError(null);
                  setStep((current) => Math.max(1, current - 1));
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            ) : null}
            {wizard && step < 6 ? (
              <Button type="button" size="sm" onClick={goNext}>
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  name="intent"
                  value="draft"
                  variant="outline"
                  size="sm"
                  loading={pending}
                  disabled={!editable}
                  onClick={(event) => {
                    if (!validateAll(event)) return;
                  }}
                >
                  Save draft
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="submit"
                  size="sm"
                  disabled={!editable || pending}
                  loading={pending}
                  onClick={(event) => {
                    if (!validateAll(event)) return;
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit for review
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
