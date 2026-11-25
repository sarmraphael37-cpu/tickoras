import type { Metadata } from "next";
import { BarChart3, Gift, Link2, Users } from "lucide-react";
import {
  AffiliateStatusButtons,
  MarketingSettingsForm,
  PromoCodeForm,
  PromoRowActions,
} from "@/components/marketing/marketing-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireOrganizer } from "@/lib/auth";
import {
  getMarketingAnalytics,
  listOrganizerAffiliates,
  listPromoCodes,
} from "@/lib/data/marketing";
import { listOrganizerEvents } from "@/lib/data/organizer";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

export default async function OrganizerMarketingPage() {
  const viewer = await requireOrganizer("/organizer/marketing");
  if (!viewer.organizerId) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No organizer profile"
        description="Marketing tools appear once your organizer account is approved."
      />
    );
  }

  const supabase = await createClient();
  const [settingsRes, promos, affiliates, analytics, events] =
    await Promise.all([
      supabase
        .from("organizers")
        .select(
          "referral_enabled, referral_reward_type, referral_reward_value, affiliate_commission_type, affiliate_commission_value, slug",
        )
        .eq("id", viewer.organizerId)
        .single(),
      listPromoCodes(viewer.organizerId),
      listOrganizerAffiliates(viewer.organizerId),
      getMarketingAnalytics(viewer.organizerId),
      listOrganizerEvents(viewer.organizerId),
    ]);

  const org = settingsRes.data as any;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const roas =
    analytics.marketingSpendXaf > 0
      ? analytics.attributedRevenueXaf / analytics.marketingSpendXaf
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth engine"
        title="Marketing & referrals"
        description="Promo codes, attendee referrals and affiliate partners — measured against real confirmed ticket sales."
      />

      {/* Analytics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Attributed revenue"
          value={formatXAF(analytics.attributedRevenueXaf)}
          hint="Confirmed bookings via codes/links"
          icon={BarChart3}
        />
        <StatCard
          label="Marketing spend"
          value={formatXAF(analytics.marketingSpendXaf)}
          hint="Expenses tagged 'marketing'"
          icon={BarChart3}
        />
        <StatCard
          label="ROAS"
          value={roas != null ? `${roas.toFixed(1)}x` : "—"}
          hint="Attributed revenue ÷ marketing spend"
          icon={BarChart3}
        />
        <StatCard
          label="Active promo codes"
          value={String(analytics.promoCount)}
          hint={`${analytics.promoRedemptions} redemptions · ${formatXAF(analytics.promoDiscountXaf)} discounts given`}
          icon={Gift}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Link2 className="h-3.5 w-3.5" /> Referrals
          </p>
          <p className="mt-2 text-[20px] font-semibold text-ink">
            {analytics.referralClicks} clicks
          </p>
          <p className="text-[11px] text-muted">
            {analytics.referralConversions} conversions ·{" "}
            {formatXAF(analytics.referralRewardsXaf)} rewards granted
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Users className="h-3.5 w-3.5" /> Affiliates
          </p>
          <p className="mt-2 text-[20px] font-semibold text-ink">
            {analytics.affiliateClicks} clicks
          </p>
          <p className="text-[11px] text-muted">
            {analytics.affiliateConversions} conversions ·{" "}
            {formatXAF(analytics.affiliateCommissionsXaf)} commissions
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Conversion rate
          </p>
          <p className="mt-2 text-[20px] font-semibold text-ink">
            {analytics.referralClicks + analytics.affiliateClicks > 0
              ? `${(
                  ((analytics.referralConversions + analytics.affiliateConversions) /
                    (analytics.referralClicks + analytics.affiliateClicks)) *
                  100
                ).toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-[11px] text-muted">Clicks → confirmed bookings</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Promo codes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Promotional codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <PromoCodeForm
              events={events.map((e) => ({ id: e.id, title: e.title }))}
            />
            {promos.length > 0 ? (
              <div className="divide-y divide-line border-t border-line pt-3">
                {promos.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-semibold text-ink">
                        {promo.code}
                      </p>
                      <p className="text-[10.5px] text-muted">
                        {promo.discountType === "percent"
                          ? `${promo.discountValue}% off`
                          : `${formatXAF(promo.discountValue)} off`}
                        {promo.eventTitle ? ` · ${promo.eventTitle}` : " · all events"}
                        {` · ${promo.usedCount}${promo.maxUses ? `/${promo.maxUses}` : ""} used`}
                        {promo.endsAt ? ` · ends ${formatDate(promo.endsAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={promo.status === "active" ? "success" : "neutral"}>
                        {promo.status}
                      </Badge>
                      <PromoRowActions id={promo.id} status={promo.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Rewards & commissions</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <MarketingSettingsForm
              settings={{
                referralEnabled: org?.referral_enabled ?? true,
                referralRewardType: org?.referral_reward_type ?? "fixed",
                referralRewardValue: Number(org?.referral_reward_value ?? 0),
                affiliateCommissionType:
                  org?.affiliate_commission_type ?? "percent",
                affiliateCommissionValue: Number(
                  org?.affiliate_commission_value ?? 0,
                ),
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Affiliates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-[15px]">
            Affiliates ({affiliates.length})
            {org?.slug ? (
              <span className="font-mono text-[10.5px] font-normal text-muted">
                Share: {siteUrl}/a/CODE
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="mb-4 text-[11.5px] leading-5 text-muted">
            Affiliates register with your organizer slug, get a unique tracking
            link (<code className="rounded bg-surface px-1">/a/CODE</code>), and
            earn{" "}
            {org?.affiliate_commission_type === "fixed"
              ? `${formatXAF(Number(org?.affiliate_commission_value ?? 0))} per confirmed booking`
              : `${org?.affiliate_commission_value ?? 0}% of each confirmed booking`}
            . Approve applicants below.
          </p>
          {affiliates.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No affiliates yet"
              description="Share your organizer page link so influencers and creators can apply to promote your events."
            />
          ) : (
            <div className="divide-y divide-line">
              {affiliates.map((aff) => (
                <div
                  key={aff.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {aff.displayName}
                      {aff.platform ? (
                        <span className="ml-2 text-[10.5px] font-normal text-muted">
                          via {aff.platform}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-muted">
                      /a/{aff.code} · {aff.clicks} clicks · {aff.conversions}{" "}
                      conversions · {formatXAF(aff.earningsXaf)} earned
                    </p>
                  </div>
                  <AffiliateStatusButtons id={aff.id} status={aff.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
