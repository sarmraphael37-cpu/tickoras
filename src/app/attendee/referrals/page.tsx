import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewer } from "@/lib/auth";
import {
  listMyReferralLinks,
  listMyReferralRewards,
} from "@/lib/data/marketing";
import { formatDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

export default async function AttendeeReferralsPage() {
  const viewer = await requireViewer("/attendee/referrals");
  const [links, rewards] = await Promise.all([
    listMyReferralLinks(viewer.id),
    listMyReferralRewards(viewer.id),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Grow with TICKORA"
        title="Your referrals"
        description="Share event links with friends. When they buy a confirmed ticket, you earn the organizer's reward."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Active links
          </p>
          <p className="mt-1 text-[22px] font-semibold text-ink">{links.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Total clicks
          </p>
          <p className="mt-1 text-[22px] font-semibold text-ink">
            {links.reduce((s, l) => s + l.clicks, 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Conversions
          </p>
          <p className="mt-1 text-[22px] font-semibold text-ink">
            {links.reduce((s, l) => s + l.conversions, 0)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Your referral links</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {links.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No referral links yet"
              description="Open any event page and use 'Refer friends' to generate your personal link."
              actionLabel="Discover events"
              actionHref="/events"
            />
          ) : (
            <div className="divide-y divide-line">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${link.eventSlug}`}
                      className="text-[12.5px] font-semibold text-ink hover:text-accent-300"
                    >
                      {link.eventTitle}
                    </Link>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted">
                      {siteUrl}/r/{link.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted">
                    <span>{link.clicks} clicks</span>
                    <span>{link.conversions} sales</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {rewards.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Reward history</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="divide-y divide-line">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div>
                    <p className="text-[12px] font-medium text-ink">
                      {reward.eventTitle}
                    </p>
                    <p className="text-[10.5px] text-muted">
                      {formatDate(reward.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">
                      {reward.rewardXaf > 0 ? formatXAF(reward.rewardXaf) : reward.rewardType.replace("_", " ")}
                    </span>
                    <Badge
                      tone={
                        reward.status === "paid"
                          ? "success"
                          : reward.status === "cancelled"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {reward.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
