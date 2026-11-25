import type { Metadata } from "next";
import { Images } from "lucide-react";
import {
  PortfolioManager,
  ProviderProfileForm,
} from "@/components/marketplace/marketplace-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { VerificationForm } from "@/components/trust/trust-forms";
import { requireViewer } from "@/lib/auth";
import {
  getMyProviderProfile,
  getServiceCategories,
} from "@/lib/data/marketplace";
import { getMyVerificationRequest } from "@/lib/data/trust";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Provider profile" };
export const dynamic = "force-dynamic";

export default async function ProviderProfilePage() {
  const viewer = await requireViewer("/provider/profile");
  const provider = await getMyProviderProfile(viewer.id);
  if (!provider) {
    return (
      <EmptyState
        icon={Images}
        title="No provider profile"
        description="Create your provider profile from the overview page first."
        actionLabel="Go to overview"
        actionHref="/provider"
      />
    );
  }

  const [categories, links, portfolios] = await Promise.all([
    getServiceCategories(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("service_provider_categories")
        .select("category_id")
        .eq("provider_id", provider.id);
      return (data ?? []).map((l) => l.category_id);
    })(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("provider_portfolios")
        .select("id, image_url, title, sort_order")
        .eq("provider_id", provider.id)
        .order("sort_order");
      return data ?? [];
    })(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-ink">
          Profile & portfolio
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          This is what organizers see on your public marketplace page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Business profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ProviderProfileForm
            provider={{
              businessName: provider.business_name,
              description: provider.description,
              city: provider.city,
              coverageAreas: provider.coverage_areas ?? [],
              phone: provider.phone,
              whatsapp: provider.whatsapp,
              startingPriceXaf: provider.starting_price_xaf,
              yearsExperience: provider.years_experience,
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            categories={categories}
            selectedCategoryIds={links}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <PortfolioManager items={portfolios} />
        </CardContent>
      </Card>

      <VerificationCard providerId={provider.id} isVerified={provider.is_verified} />
    </div>
  );
}

async function VerificationCard({
  providerId,
  isVerified,
}: {
  providerId: string;
  isVerified: boolean;
}) {
  const request = await getMyVerificationRequest("service_provider", providerId);
  const active = request && ["pending", "info_requested"].includes(request.status);
  const tone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
    approved: "success",
    pending: "warning",
    info_requested: "warning",
    rejected: "danger",
    suspended: "danger",
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          Verification
          {isVerified ? <Badge tone="success">Verified</Badge> : null}
          {request ? (
            <Badge tone={tone[request.status] ?? "neutral"}>
              {request.status.replace("_", " ")}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {isVerified ? (
          <p className="text-[12px] text-muted">
            Your business is verified — the badge shows on your public profile.
          </p>
        ) : active ? (
          <p className="text-[12px] text-muted">
            Application under review
            {request?.admin_note ? ` — ${request.admin_note}` : ""}.
          </p>
        ) : (
          <>
            <p className="text-[12px] text-muted">
              Submit business documents (registration, ID, portfolio) to earn
              the verified badge.
            </p>
            <VerificationForm subjectType="service_provider" subjectId={providerId} />
          </>
        )}
        {request && !isVerified ? (
          <p className="text-[10px] text-faint">
            Last update {formatDate(request.updated_at)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
