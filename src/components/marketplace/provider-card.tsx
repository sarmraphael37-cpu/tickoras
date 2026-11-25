import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { ServiceProvider } from "@/lib/data/marketplace";
import { formatXAF } from "@/lib/utils";

export function ProviderCard({ provider }: { provider: ServiceProvider }) {
  return (
    <Link href={`/services/${provider.slug}`} className="group block">
      <Card className="flex h-full flex-col p-5 transition hover:border-brand-300">
        <div className="flex items-start gap-3">
          <Avatar
            name={provider.businessName}
            src={provider.logoUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-ink">
              {provider.businessName}
              {provider.isVerified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-accent-300" />
              ) : null}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
              <MapPin className="h-3 w-3" />
              {provider.city ?? "Cameroon"}
              {provider.coverageAreas.length > 0
                ? ` · serves ${provider.coverageAreas.slice(0, 2).join(", ")}`
                : ""}
            </p>
          </div>
          {provider.ratingCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-[10.5px] font-semibold text-warning">
              <Star className="h-3 w-3 fill-current" />
              {provider.ratingAvg.toFixed(1)}
            </span>
          ) : null}
        </div>

        {provider.categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {provider.categories.slice(0, 3).map((cat) => (
              <Badge key={cat.id} tone="outline" className="text-[9.5px]">
                {cat.name}
              </Badge>
            ))}
          </div>
        ) : null}

        {provider.description ? (
          <p className="mt-3 line-clamp-2 text-[11.5px] leading-5 text-muted">
            {provider.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-line pt-3 mt-3">
          <span className="text-[10.5px] text-muted">
            {provider.yearsExperience
              ? `${provider.yearsExperience} yrs experience`
              : "Service provider"}
          </span>
          <span className="text-[12px] font-semibold text-ink">
            {provider.startingPriceXaf
              ? `from ${formatXAF(provider.startingPriceXaf)}`
              : "Price on request"}
          </span>
        </div>
      </Card>
    </Link>
  );
}
