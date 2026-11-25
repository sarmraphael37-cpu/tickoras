import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/organizer/event-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { requireOrganizer } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/data/organizer";
import { getCategories } from "@/lib/data/public";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireOrganizer(`/organizer/events/${id}/edit`);
  if (!viewer.organizerId) notFound();

  const [detail, { categories }] = await Promise.all([
    getOrganizerEvent(viewer.organizerId, id),
    getCategories(),
  ]);
  if (!detail) notFound();

  const editable = ["draft", "rejected"].includes(detail.status);

  return (
    <div className="space-y-6">
      <Link
        href={`/organizer/events/${detail.id}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>

      <PageHeader
        eyebrow="Edit draft"
        title={detail.title}
        description="Update the details below. Saving keeps this event as a private draft."
      />

      {!editable ? (
        <Alert tone="warning" title="This event can no longer be edited">
          Only drafts and rejected events are editable. Published events are locked to
          protect attendees who have already bought tickets.
        </Alert>
      ) : null}

      <EventForm
        organizerId={viewer.organizerId}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        editable={editable}
        defaults={{
          id: detail.event.id,
          title: detail.event.title,
          slug: detail.event.slug,
          categoryId: detail.event.category_id ?? "",
          description: detail.event.description,
          shortDescription: detail.event.short_description ?? "",
          venueName: detail.event.venue_name,
          address: detail.event.address ?? "",
          city: detail.event.city,
          latitude: detail.event.latitude,
          longitude: detail.event.longitude,
          startAt: detail.event.start_at,
          endAt: detail.event.end_at,
          coverImageUrl: detail.event.cover_image_url ?? "",
          bannerImageUrl: detail.event.banner_image_url ?? "",
        }}
        tiers={detail.ticketTypes.map((tier) => ({
          id: tier.id,
          name: tier.name,
          description: tier.description ?? "",
          priceXaf: Number(tier.price_xaf),
          quantityTotal: Number(tier.quantity_total),
          minPerOrder: Number(tier.min_per_order),
          maxPerOrder: Number(tier.max_per_order),
          salesStartAt: tier.sales_start_at ?? "",
          salesEndAt: tier.sales_end_at ?? "",
          isActive: tier.is_active,
        }))}
      />
    </div>
  );
}
