"use client";

import { useActionState, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Link2,
  Mail,
  MessageCircle,
  X,
} from "lucide-react";
import {
  createPromoCode,
  deletePromoCode,
  registerAsAffiliate,
  setAffiliateStatus,
  setPromoStatus,
  updateMarketingSettings,
} from "@/app/actions/marketing";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

function Messages({ state }: { state: ActionState }) {
  if (state.status === "error") return <Alert tone="danger">{state.message}</Alert>;
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return null;
}

// ---------------------------------------------------------------------------
// Promo code form
// ---------------------------------------------------------------------------

export function PromoCodeForm({
  events,
}: {
  events: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createPromoCode,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="promo-code">Code</Label>
          <Input
            id="promo-code"
            name="code"
            required
            maxLength={32}
            placeholder="e.g. EARLYBIRD"
            className="uppercase"
          />
        </div>
        <div>
          <Label htmlFor="promo-event">Event (optional — blank = all events)</Label>
          <Select id="promo-event" name="event_id" defaultValue="">
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="promo-type">Discount type</Label>
          <Select id="promo-type" name="discount_type" defaultValue="percent">
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (XAF)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="promo-value">Discount value</Label>
          <Input id="promo-value" name="discount_value" type="number" min={1} required placeholder="e.g. 20 or 5000" />
        </div>
        <div>
          <Label htmlFor="promo-max">Max uses (optional)</Label>
          <Input id="promo-max" name="max_uses" type="number" min={1} placeholder="Unlimited" />
        </div>
        <div>
          <Label htmlFor="promo-min">Min order (XAF)</Label>
          <Input id="promo-min" name="min_order_xaf" type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="promo-start">Starts</Label>
          <Input id="promo-start" name="starts_at" type="datetime-local" />
        </div>
        <div>
          <Label htmlFor="promo-end">Expires</Label>
          <Input id="promo-end" name="ends_at" type="datetime-local" />
        </div>
      </div>
      <div>
        <Label htmlFor="promo-desc">Description (optional)</Label>
        <Input id="promo-desc" name="description" maxLength={300} placeholder="e.g. Early bird special" />
      </div>
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Creating…" : "Create promo code"}
      </Button>
      <Messages state={state} />
    </form>
  );
}

export function PromoRowActions({
  id,
  status,
}: {
  id: string;
  status: "active" | "paused";
}) {
  return (
    <div className="flex gap-1.5">
      <form action={setPromoStatus}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={status === "active" ? "paused" : "active"} />
        <Button type="submit" size="sm" variant="outline">
          {status === "active" ? "Pause" : "Activate"}
        </Button>
      </form>
      <form action={deletePromoCode}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="outline">
          Delete
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marketing settings (referral rewards + affiliate commission)
// ---------------------------------------------------------------------------

export function MarketingSettingsForm({
  settings,
}: {
  settings: {
    referralEnabled: boolean;
    referralRewardType: string;
    referralRewardValue: number;
    affiliateCommissionType: string;
    affiliateCommissionValue: number;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateMarketingSettings,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-line p-3">
        <div>
          <p className="text-[12.5px] font-medium text-ink">Attendee referrals</p>
          <p className="text-[10.5px] text-muted">
            Let ticket holders share referral links for your events.
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            name="referral_enabled"
            value="true"
            defaultChecked={settings.referralEnabled}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-brand-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ref-type">Referral reward type</Label>
          <Select
            id="ref-type"
            name="referral_reward_type"
            defaultValue={settings.referralRewardType}
          >
            <option value="fixed">Fixed XAF per conversion</option>
            <option value="percent">Percent of booking</option>
            <option value="discount_voucher">Discount voucher</option>
            <option value="loyalty_points">Loyalty points</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ref-value">Reward value</Label>
          <Input
            id="ref-value"
            name="referral_reward_value"
            type="number"
            min={0}
            defaultValue={settings.referralRewardValue}
          />
        </div>
        <div>
          <Label htmlFor="aff-type">Affiliate commission type</Label>
          <Select
            id="aff-type"
            name="affiliate_commission_type"
            defaultValue={settings.affiliateCommissionType}
          >
            <option value="percent">Percent of booking</option>
            <option value="fixed">Fixed XAF per conversion</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="aff-value">Commission value</Label>
          <Input
            id="aff-value"
            name="affiliate_commission_value"
            type="number"
            min={0}
            defaultValue={settings.affiliateCommissionValue}
          />
        </div>
      </div>
      <p className="text-[10.5px] text-muted">
        Rewards and commissions are only granted after a referred booking is
        confirmed — failed, cancelled or refunded bookings never count.
      </p>
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
      <Messages state={state} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Affiliate approve/reject
// ---------------------------------------------------------------------------

export function AffiliateStatusButtons({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  async function act(status: "approved" | "rejected" | "suspended") {
    setPending(status);
    await setAffiliateStatus(id, status);
    setPending(null);
  }
  if (status === "approved") {
    return (
      <div className="flex gap-1.5">
        <Badge tone="success">Approved</Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void act("suspended")}
          disabled={pending !== null}
        >
          Suspend
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-1.5">
      {status === "pending" ? <Badge tone="warning">Pending</Badge> : null}
      {status === "rejected" ? <Badge tone="danger">Rejected</Badge> : null}
      {status === "suspended" ? <Badge tone="neutral">Suspended</Badge> : null}
      <Button
        size="sm"
        onClick={() => void act("approved")}
        disabled={pending !== null}
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
      {status !== "rejected" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void act("rejected")}
          disabled={pending !== null}
        >
          <X className="h-3.5 w-3.5" /> Reject
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Affiliate self-registration (organizer public page)
// ---------------------------------------------------------------------------

export function AffiliateApplyForm({ organizerSlug }: { organizerSlug: string }) {
  const [state, formAction, pending] = useActionState(
    registerAsAffiliate,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="organizer_slug" value={organizerSlug} />
      <div>
        <Label htmlFor="aff-name">Display name / brand</Label>
        <Input id="aff-name" name="display_name" required maxLength={120} placeholder="e.g. DJ Kay-Crew" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="aff-platform">Platform</Label>
          <Input id="aff-platform" name="platform" maxLength={60} placeholder="Instagram, TikTok, blog…" />
        </div>
        <div>
          <Label htmlFor="aff-audience">Audience size (optional)</Label>
          <Input id="aff-audience" name="audience_size" type="number" min={0} placeholder="e.g. 5000" />
        </div>
      </div>
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Submitting…" : "Apply to be an affiliate"}
      </Button>
      <Messages state={state} />
      <p className="text-[10px] text-muted">
        You need a TICKORA account. The organizer reviews every application.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Referral share widget (event page)
// ---------------------------------------------------------------------------

export function ReferralShareWidget({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const link = code ? `${siteUrl}/r/${code}` : "";
  const shareText = encodeURIComponent(`Join me at ${eventTitle} on TICKORA!`);

  async function ensureLink() {
    if (code) return code;
    setLoading(true);
    setError(null);
    try {
      // getOrCreateReferralLink is a server action; import lazily to keep this
      // component self-contained.
      const { getOrCreateReferralLink } = await import(
        "@/app/actions/marketing"
      );
      const res = await getOrCreateReferralLink(eventId);
      if ("error" in res) {
        setError(res.error);
        return null;
      }
      setCode(res.code);
      return res.code;
    } catch {
      setError("Could not create your referral link.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function share(channel: "whatsapp" | "facebook" | "email" | "copy") {
    const c = await ensureLink();
    if (!c) return;
    const url = `${siteUrl}/r/${c}`;
    const text = `Join me at ${eventTitle} on TICKORA!`;
    if (channel === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
        "_blank",
      );
    } else if (channel === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "_blank",
      );
    } else if (channel === "email") {
      window.location.href = `mailto:?subject=${encodeURIComponent(`Join me at ${eventTitle}`)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
        <Link2 className="h-3.5 w-3.5 text-accent-300" />
        Refer friends, earn rewards
      </p>
      <p className="mt-1 text-[10.5px] leading-4 text-muted">
        Share your personal link. When a friend buys a confirmed ticket, you
        earn the organizer&apos;s referral reward.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={() => void share("whatsapp")} loading={loading}>
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => void share("facebook")} disabled={loading}>
          <Facebook className="h-3.5 w-3.5" /> Facebook
        </Button>
        <Button size="sm" variant="outline" onClick={() => void share("email")} disabled={loading}>
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => void share("copy")} disabled={loading}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-[10.5px] text-danger">{error}</p> : null}
      {link ? (
        <p className="mt-2 truncate font-mono text-[10px] text-muted">{link}</p>
      ) : null}
    </div>
  );
}
