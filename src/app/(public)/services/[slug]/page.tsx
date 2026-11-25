import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate, formatXAF } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { getServiceProviderBySlug } from "@/lib/data/marketplace";
import { EventMap, directionsUrl } from "@/components/maps/map-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getServiceProviderBySlug(slug);
  return {
    title: provider ? provider.businessName : "Service provider",
    description: provider?.description?.slice(0, 160),
  };
}

export default async function ProviderPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await getServiceProviderBySlug(slug);
  if (!provider) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-cream">
          <div className="container-page pb-8 pt-8">
            <nav className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/" className="hover:text-ink">Home</Link>
              <span>/</span>
              <Link href="/services" className="hover:text-ink">Services</Link>
              <span>/</span>
              <span className="text-ink">{provider.businessName}</span>
            </nav>
            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar name={provider.businessName} src={provider.logoUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[30px] leading-tight text-ink sm:text-[38px]">
                    {provider.businessName}
                  </h1>
                  {provider.isVerified ? (
                    <Badge tone="success">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted">
                  {provider.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {provider.city}
                    </span>
                  ) : null}
                  {provider.ratingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {provider.ratingAvg.toFixed(1)} · {provider.ratingCount} reviews
                    </span>
                  ) : null}
                  {provider.yearsExperience ? (
                    <span>{provider.yearsExperience} years experience</span>
                  ) : null}
                </div>
                {provider.categories.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {provider.categories.map((cat) => (
                      <Badge key={cat.id} tone="outline">{cat.name}</Badge>
                    ))}
                  </div>
                ) : null}
                {provider.coverageAreas.length > 0 ? (
                  <p className="mt-3 text-[12px] text-muted">
                    Serves: {provider.coverageAreas.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Starting at</p>
                <p className="text-[22px] font-semibold text-ink">
                  {provider.startingPriceXaf ? formatXAF(provider.startingPriceXaf) : "On request"}
                </p>
                <Link
                  href={`/organizer/services?provider=${provider.slug}`}
                  className={cn(buttonVariants({ size: "lg" }), "w-full")}
                >
                  Request a quote
                </Link>
                {provider.whatsapp ? (
                  <a
                    href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                ) : null}
                {provider.phone ? (
                  <a
                    href={`tel:${provider.phone}`}
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="container-page grid gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {provider.description ? (
              <Card className="p-5">
                <h2 className="text-[15px] font-semibold text-ink">About</h2>
                <p className="mt-2 whitespace-pre-line text-[12.5px] leading-6 text-muted">
                  {provider.description}
                </p>
              </Card>
            ) : null}

            {provider.latitude != null && provider.longitude != null ? (
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <MapPin className="h-4 w-4 text-accent-300" />
                    Location
                  </h2>
                  <a
                    href={directionsUrl(provider.latitude, provider.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-accent-300 hover:underline"
                  >
                    Directions
                  </a>
                </div>
                <div className="mt-3">
                  <EventMap
                    points={[
                      {
                        id: provider.id,
                        lat: provider.latitude,
                        lng: provider.longitude,
                        title: provider.businessName,
                        subtitle: provider.city ?? "Cameroon",
                      },
                    ]}
                    height={260}
                    zoom={13}
                  />
                </div>
              </Card>
            ) : null}

            {provider.portfolios.length > 0 ? (
              <Card className="p-5">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <CalendarDays className="h-4 w-4 text-accent-300" />
                  Portfolio
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {provider.portfolios.map((item) => (
                    <figure key={item.id} className="overflow-hidden rounded-xl border border-line">
                      <Image
                        src={item.image_url}
                        alt={item.title ?? "Portfolio"}
                        width={400}
                        height={300}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {item.title ? (
                        <figcaption className="truncate px-2 py-1.5 text-[10.5px] text-muted">
                          {item.title}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </Card>
            ) : null}

            {provider.reviews.length > 0 ? (
              <Card className="p-5">
                <h2 className="text-[15px] font-semibold text-ink">
                  Reviews ({provider.reviews.length})
                </h2>
                <div className="mt-4 space-y-4">
                  {provider.reviews.map((review) => (
                    <div key={review.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 text-warning">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={
                                i < review.rating
                                  ? "h-3.5 w-3.5 fill-current"
                                  : "h-3.5 w-3.5 text-faint"
                              }
                            />
                          ))}
                        </span>
                        <span className="text-[11.5px] font-medium text-ink">
                          {review.authorName}
                        </span>
                        <span className="text-[10px] text-muted">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.comment ? (
                        <p className="mt-1.5 text-[12px] leading-5 text-muted">
                          {review.comment}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-ink">Book this provider</h2>
              <p className="mt-1.5 text-[11.5px] leading-5 text-muted">
                Send a booking request with your event details. The provider
                will respond with a quotation.
              </p>
              <Link
                href={`/organizer/services?provider=${provider.slug}`}
                className={cn(buttonVariants(), "mt-4 w-full")}
              >
                Request a quote
              </Link>
              <p className="mt-3 text-[10.5px] leading-4 text-muted">
                You need an approved organizer account to send requests.
              </p>
            </Card>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
