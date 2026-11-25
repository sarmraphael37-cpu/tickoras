import type { Metadata } from "next";
import { CreditCard, Sparkles } from "lucide-react";
import {
  CancelSubscriptionButton,
  PlanCheckoutForm,
  PromoteEventForm,
} from "@/components/organizer/billing-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrganizer } from "@/lib/auth";
import {
  getOrganizerSubscription,
  listFeaturedPromotions,
  listPlatformPayments,
  listSubscriptionPlans,
} from "@/lib/data/billing";
import { listOrganizerEvents } from "@/lib/data/organizer";
import { formatDate, formatXAF } from "@/lib/utils";
import { Check } from "lucide-react";

export const metadata: Metadata = { title: "Billing & plans" };
export const dynamic = "force-dynamic";

const FEATURE_LABELS: Record<string, string> = {
  events: "Events",
  digital_tickets: "Digital tickets",
  qr_checkin: "QR check-in",
  basic_analytics: "Basic analytics",
  advanced_analytics: "Advanced analytics",
  marketing: "Referral & promo marketing",
  finance_reports: "Financial reports",
  ai_assistant: "AI assistant",
  multi_event: "Multi-event management",
  custom_branding: "Custom branding",
  api_access: "API access",
  priority_support: "Priority support",
};

export default async function OrganizerBillingPage() {
  const viewer = await requireOrganizer("/organizer/billing");
  if (!viewer.organizerId) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No organizer profile"
        description="Billing is available once your organizer account exists."
      />
    );
  }

  const [plans, { subscription, plan: currentPlan }, payments, promotions, events] =
    await Promise.all([
      listSubscriptionPlans(),
      getOrganizerSubscription(viewer.organizerId),
      listPlatformPayments(viewer.organizerId),
      listFeaturedPromotions(viewer.organizerId),
      listOrganizerEvents(viewer.organizerId),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monetization"
        title="Plans & billing"
        description="Choose a plan that matches your ambitions. Existing events and records are never deleted when a plan changes."
      />

      {/* Current plan */}
      {subscription && currentPlan ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              Current plan: {currentPlan.name}
              <Badge tone="success">{subscription.status}</Badge>
              {subscription.cancel_at_period_end ? (
                <Badge tone="warning">Cancels at period end</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <p className="text-[12px] text-muted">
              {formatXAF(currentPlan.price_xaf)}/mo · renews{" "}
              {formatDate(subscription.current_period_end)}
            </p>
            {!subscription.cancel_at_period_end ? (
              <CancelSubscriptionButton subscriptionId={subscription.id} />
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-5 text-[12.5px] text-muted">
            You&apos;re on the <strong className="text-ink">Starter</strong> free
            plan — 1 event, digital tickets, QR check-in and basic analytics.
          </CardContent>
        </Card>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Plans</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = currentPlan?.id === p.id;
            const features = (p.features ?? {}) as Record<string, boolean | number>;
            return (
              <Card
                key={p.id}
                className={isCurrent ? "border-brand-400 ring-1 ring-brand-400" : ""}
              >
                <CardHeader>
                  <CardTitle className="text-[15px]">{p.name}</CardTitle>
                  <p className="text-[22px] font-semibold text-ink">
                    {p.price_xaf === 0 ? "Free" : formatXAF(p.price_xaf)}
                    {p.price_xaf > 0 ? (
                      <span className="text-[11px] font-normal text-muted">/mo</span>
                    ) : null}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <ul className="space-y-1.5">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const value = features[key];
                      const included =
                        typeof value === "number"
                          ? value === -1 || value > 1
                          : Boolean(value);
                      return (
                        <li
                          key={key}
                          className={`flex items-center gap-1.5 text-[11px] ${
                            included ? "text-ink" : "text-faint line-through"
                          }`}
                        >
                          <Check className={`h-3 w-3 ${included ? "text-accent-300" : "text-line"}`} />
                          {label}
                          {typeof value === "number" && value > 0
                            ? ` (${value === -1 ? "unlimited" : value})`
                            : ""}
                        </li>
                      );
                    })}
                  </ul>
                  <PlanCheckoutForm
                    planId={p.id}
                    planName={p.name}
                    priceXaf={p.price_xaf}
                    currentPlan={isCurrent}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Featured promotions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="h-4 w-4 text-accent-300" /> Featured promotions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {events.length === 0 ? (
            <p className="text-[12px] text-muted">Create an event first to promote it.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-xl border border-line p-3">
                  <p className="truncate text-[12px] font-semibold text-ink">{event.title}</p>
                  <div className="mt-2">
                    <PromoteEventForm eventId={event.id} eventTitle={event.title} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {promotions.length > 0 ? (
            <div className="divide-y divide-line border-t border-line pt-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="flex items-center justify-between py-2 text-[11.5px]">
                  <span className="text-muted">
                    {promo.placement} · {formatXAF(promo.amount_xaf)} · until{" "}
                    {formatDate(promo.ends_at)}
                  </span>
                  <Badge tone={promo.status === "active" ? "success" : "neutral"}>
                    {promo.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Payment history</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {payments.length === 0 ? (
            <p className="text-[12px] text-muted">No platform payments yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {payments.map((pay) => (
                <div key={pay.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">
                      {pay.kind === "subscription" ? "Subscription" : "Featured promotion"} ·{" "}
                      {formatXAF(pay.amount_xaf)}
                    </p>
                    <p className="text-[10.5px] text-muted">
                      {pay.provider} · {formatDate(pay.created_at)}
                      {pay.is_demo ? " · demo" : ""}
                    </p>
                  </div>
                  <Badge
                    tone={
                      pay.status === "succeeded"
                        ? "success"
                        : pay.status === "pending"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {pay.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
