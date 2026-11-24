import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Boxes, Ticket } from "lucide-react";
import { updateTicketTypeAction } from "@/app/actions/organizer";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
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
import { listOrganizerTicketTypes } from "@/lib/data/organizer";
import { formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Ticket management" };

export default async function OrganizerTicketsPage() {
  const viewer = await requireOrganizer("/organizer/tickets");
  const tickets = viewer.organizerId
    ? await listOrganizerTicketTypes(viewer.organizerId)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Ticket management"
        description="Inventory across every event. Capacity changes are validated against sold and reserved tickets on the server."
      />

      <Alert tone="info" title="Inventory safety">
        You may raise capacity at any time. Reductions are blocked when they would
        fall below tickets already sold or held by active reservations.
      </Alert>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card px-5 py-12 text-center">
          <Ticket className="mx-auto h-6 w-6 text-accent-300" />
          <p className="mt-3 text-[13px] font-semibold text-ink">
            No ticket tiers yet
          </p>
          <p className="mt-1 text-[11.5px] text-muted">
            Ticket tiers are created while building an event.
          </p>
          <Link
            href="/organizer/events/create"
            className="mt-4 inline-flex text-[11.5px] font-semibold text-accent-300 hover:underline"
          >
            Create an event →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden glass-subtle rounded-xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Event</TH>
              <TH>Tier</TH>
              <TH>Price</TH>
              <TH>Inventory</TH>
              <TH>Available</TH>
              <TH>Status</TH>
              <TH>Update</TH>
            </THead>
            <TBody>
              {tickets.map((ticket) => {
                const available = Math.max(
                  0,
                  ticket.quantityTotal -
                    ticket.quantitySold -
                    ticket.quantityReserved,
                );
                return (
                  <TR key={ticket.id}>
                    <TD>
                      <Link
                        href={`/organizer/events/${ticket.eventId}/tickets`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-ink hover:text-accent-200"
                      >
                        {ticket.eventTitle}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TD>
                    <TD className="font-medium text-ink">{ticket.name}</TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {ticket.priceXaf === 0
                        ? "Free"
                        : formatXAF(ticket.priceXaf)}
                    </TD>
                    <TD className="text-[11.5px] text-muted">
                      {ticket.quantitySold} sold · {ticket.quantityReserved} held ·{" "}
                      {ticket.quantityTotal} total
                    </TD>
                    <TD>
                      <Badge tone={available === 0 ? "warning" : "success"}>
                        <Boxes className="h-3 w-3" />
                        {available}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={ticket.isActive ? "success" : "neutral"}>
                        {ticket.isActive ? "On sale" : "Hidden"}
                      </Badge>
                    </TD>
                    <TD>
                      <ActionForm
                        action={updateTicketTypeAction}
                        hidden={{ ticket_id: ticket.id }}
                        submitLabel="Save"
                        pendingLabel="Saving…"
                        variant="outline"
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Input
                          type="number"
                          name="quantity_total"
                          defaultValue={ticket.quantityTotal}
                          min={ticket.quantitySold + ticket.quantityReserved}
                          className="h-8 w-20 text-[11px]"
                          aria-label={`Total quantity for ${ticket.name}`}
                        />
                        <Select
                          name="is_active"
                          defaultValue={ticket.isActive ? "true" : "false"}
                          className="h-8 w-24 text-[11px]"
                          aria-label={`Sales status for ${ticket.name}`}
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
        </div>
      )}
    </div>
  );
}
