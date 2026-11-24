import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, LockKeyhole, Ticket } from "lucide-react";
import { updateTicketTypeAction } from "@/app/actions/organizer";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventTabs } from "@/components/organizer/event-tabs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/data/organizer";
import { formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Ticket management" };

export default async function EventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireOrganizer(`/organizer/events/${id}/tickets`);
  if (!viewer.organizerId) notFound();
  const detail = await getOrganizerEvent(viewer.organizerId, id);
  if (!detail) notFound();

  const locked = ["pending_approval", "published", "suspended"].includes(
    detail.status,
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/organizer/events/${id}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>
      <PageHeader
        eyebrow="Event workspace"
        title="Ticket management"
        description={`Inventory and sales controls for ${detail.title}.`}
      />
      <EventTabs eventId={id} active="tickets" />

      <Alert tone="info" title="Inventory is guarded by the server">
        Capacity can be raised at any time. It can never be reduced below tickets
        already sold or reserved, so completed bookings always remain valid.
      </Alert>

      {locked ? (
        <Alert tone="warning" title="Event is locked for sales integrity">
          This event is in review or live. You may still raise capacity to avoid
          overselling, but pricing and tier removal are fixed.
        </Alert>
      ) : null}

      <div className="overflow-hidden glass-subtle rounded-xl shadow-card">
        <TableContainer>
          <THead>
            <TH>Tier</TH>
            <TH>Price</TH>
            <TH>Total</TH>
            <TH>Reserved</TH>
            <TH>Sold</TH>
            <TH>Available</TH>
            <TH>Sales</TH>
            <TH>Update capacity</TH>
          </THead>
          <TBody>
            {detail.ticketTypes.map((tier) => {
              const sold = Number(tier.quantity_sold ?? 0);
              const reserved = Number(tier.quantity_reserved ?? 0);
              const total = Number(tier.quantity_total ?? 0);
              const available = Math.max(0, total - sold - reserved);
              return (
                <TR key={tier.id}>
                  <TD>
                    <p className="font-medium text-ink">{tier.name}</p>
                    <p className="mt-0.5 max-w-[220px] truncate text-[10.5px] text-muted">
                      {tier.description || "No description"}
                    </p>
                  </TD>
                  <TD className="whitespace-nowrap font-semibold">
                    {Number(tier.price_xaf) === 0
                      ? "Free"
                      : formatXAF(Number(tier.price_xaf))}
                  </TD>
                  <TD>{total}</TD>
                  <TD>{reserved}</TD>
                  <TD>{sold}</TD>
                  <TD>
                    <Badge tone={available === 0 ? "warning" : "success"}>
                      <Boxes className="h-3 w-3" />
                      {available}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={tier.is_active ? "success" : "neutral"}>
                      {tier.is_active ? "On sale" : "Hidden"}
                    </Badge>
                  </TD>
                  <TD>
                    <ActionForm
                      action={updateTicketTypeAction}
                      hidden={{ ticket_id: tier.id }}
                      submitLabel="Save"
                      pendingLabel="Saving…"
                      variant="outline"
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Input
                        type="number"
                        name="quantity_total"
                        defaultValue={total}
                        min={sold + reserved}
                        className="h-8 w-20 text-[11px]"
                        aria-label={`Total quantity for ${tier.name}`}
                      />
                      <Select
                        name="is_active"
                        defaultValue={tier.is_active ? "true" : "false"}
                        className="h-8 w-24 text-[11px]"
                        aria-label={`Sales status for ${tier.name}`}
                      >
                        <option value="true">On sale</option>
                        <option value="false">Hidden</option>
                      </Select>
                    </ActionForm>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </TableContainer>
        {detail.ticketTypes.length === 0 ? (
          <div className="px-5 py-12 text-center text-[12px] text-muted">
            No ticket tiers have been configured for this event.
          </div>
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <LockKeyhole className="h-3.5 w-3.5 text-accent-300" />
        Ticket prices are fixed after sales begin. Contact support if you need a
        correction that affects paid bookings.
      </p>
    </div>
  );
}
