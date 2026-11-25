import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Briefcase, CheckCircle2, Star } from "lucide-react";
import {
  CreateProviderForm,
  ServiceStatusBadge,
} from "@/components/marketplace/marketplace-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireViewer } from "@/lib/auth";
import {
  getMyProviderProfile,
  getProviderBookings,
  getProviderEarnings,
  getServiceCategories,
} from "@/lib/data/marketplace";
import { formatDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Provider dashboard" };
export const dynamic = "force-dynamic";

export default async function ProviderPage() {
  const viewer = await requireViewer("/provider");
  const provider = await getMyProviderProfile(viewer.id);

  if (!provider) {
    const categories = await getServiceCategories();
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            Service marketplace
          </p>
          <h1 className="mt-1.5 font-display text-[28px] leading-tight text-ink sm:text-[34px]">
            Become a TICKORA service provider
          </h1>
          <p className="mt-2 text-[12.5px] leading-6 text-muted">
            Offer photography, catering, security, venues and more to event
            organizers across Cameroon. Create your free provider profile to
            start receiving booking requests.
          </p>
        </div>
        <Card className="p-5 sm:p-6">
          <CardTitle className="text-[16px]">Create your provider profile</CardTitle>
          <div className="mt-4">
            <CreateProviderForm categories={categories} />
          </div>
        </Card>
      </div>
    );
  }

  const [earnings, bookings] = await Promise.all([
    getProviderEarnings(viewer.id),
    getProviderBookings(viewer.id),
  ]);
  const recent = bookings.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            Provider workspace
          </p>
          <h1 className="mt-1.5 font-display text-[28px] leading-tight text-ink sm:text-[34px]">
            {provider.business_name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {provider.is_verified ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge tone="outline">Unverified</Badge>
            )}
            {provider.rating_count > 0 ? (
              <Badge tone="warning">
                <Star className="h-3 w-3 fill-current" />
                {Number(provider.rating_avg).toFixed(1)} ({provider.rating_count})
              </Badge>
            ) : (
              <Badge tone="neutral">No reviews yet</Badge>
            )}
            <Link
              href={`/services/${provider.slug}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 hover:underline"
            >
              Public page <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Completed jobs"
          value={String(earnings.completedCount)}
          icon={Briefcase}
        />
        <StatCard
          label="Gross earnings"
          value={formatXAF(earnings.grossXaf)}
          hint="Completed bookings"
          icon={Briefcase}
        />
        <StatCard
          label="Platform commission"
          value={formatXAF(earnings.commissionXaf)}
          hint="Deducted from completed jobs"
          icon={Briefcase}
        />
        <StatCard
          label="Net earnings"
          value={formatXAF(earnings.netXaf)}
          hint={`${earnings.pendingCount} open requests`}
          icon={Briefcase}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent booking requests
            <Link
              href="/provider/bookings"
              className="text-[11px] font-medium text-accent-300 hover:underline"
            >
              View all
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {recent.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No booking requests yet"
              description="Complete your profile and portfolio to attract organizer bookings."
            />
          ) : (
            <div className="divide-y divide-line">
              {recent.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-ink">
                      {booking.title}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {booking.reference} · {booking.counterpartyName}
                      {booking.eventDate ? ` · ${formatDate(booking.eventDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.quotedAmountXaf ? (
                      <span className="text-[12px] font-semibold text-ink">
                        {formatXAF(booking.quotedAmountXaf)}
                      </span>
                    ) : null}
                    <ServiceStatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
