import type { Metadata } from "next";
import { Images } from "lucide-react";
import {
  PortfolioManager,
  ProviderProfileForm,
} from "@/components/marketplace/marketplace-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewer } from "@/lib/auth";
import {
  getMyProviderProfile,
  getServiceCategories,
} from "@/lib/data/marketplace";
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
    </div>
  );
}
