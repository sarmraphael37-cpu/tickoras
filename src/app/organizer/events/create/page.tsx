import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { EventForm } from "@/components/organizer/event-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { requireOrganizer } from "@/lib/auth";
import { getCategories } from "@/lib/data/public";

export const metadata: Metadata = { title: "Create an event" };

export default async function CreateEventPage() {
  const viewer = await requireOrganizer("/organizer/events/create");

  if (!viewer.organizerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Create an event"
          description="We could not find your organizer profile."
        />
        <Alert tone="warning" title="Organizer profile missing">
          Contact TICKORA support so we can connect your organization before you
          create events.
        </Alert>
      </div>
    );
  }

  const { categories } = await getCategories();

  return (
    <div className="space-y-6">
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to events
      </Link>

      <PageHeader
        eyebrow="New event"
        title="Create an event"
        description="Six focused steps from first idea to review. Save a draft at any time — nothing goes public until TICKORA approves it."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[11px] font-medium text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-300" />
            Organizer approval required to publish
          </span>
        }
      />

      <Alert tone="info" title="How publishing works">
        <span className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Saving keeps your work as a private draft. Submitting sends it to the
            TICKORA approval queue. Organizers can never approve their own events.
          </span>
        </span>
      </Alert>

      <EventForm
        wizard
        organizerId={viewer.organizerId}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        defaults={{
          title: "",
          slug: "",
          categoryId: "",
          description: "",
          shortDescription: "",
          venueName: "",
          address: "",
          city: "Buea",
          startAt: "",
          endAt: "",
          coverImageUrl: "",
          bannerImageUrl: "",
        }}
      />
    </div>
  );
}
