import { Badge } from "@/components/ui/badge";
import type {
  BookingStatus,
  EventStatus,
  OrganizerStatus,
  PaymentStatus,
  PayoutStatus,
  RefundStatus,
  TicketStatus,
} from "@/types/database";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "dark" | "outline";

const EVENT: Record<EventStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_approval: { label: "Pending approval", tone: "warning" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  completed: { label: "Completed", tone: "info" },
};

const BOOKING: Record<BookingStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Awaiting payment", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "info" },
};

const PAYMENT: Record<PaymentStatus, { label: string; tone: Tone }> = {
  initiated: { label: "Initiated", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  requires_action: { label: "Action required", tone: "warning" },
  succeeded: { label: "Succeeded", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const TICKET: Record<TicketStatus, { label: string; tone: Tone }> = {
  valid: { label: "Valid", tone: "success" },
  used: { label: "Checked in", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "info" },
};

const ORGANIZER: Record<OrganizerStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

const REFUND: Record<RefundStatus, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  rejected: { label: "Rejected", tone: "danger" },
  processed: { label: "Processed", tone: "success" },
};

const PAYOUT: Record<PayoutStatus, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

type Props =
  | { kind: "event"; status: EventStatus }
  | { kind: "booking"; status: BookingStatus }
  | { kind: "payment"; status: PaymentStatus; demo?: boolean }
  | { kind: "ticket"; status: TicketStatus }
  | { kind: "organizer"; status: OrganizerStatus }
  | { kind: "refund"; status: RefundStatus }
  | { kind: "payout"; status: PayoutStatus };

export function StatusBadge(props: Props) {
  let entry: { label: string; tone: Tone };
  switch (props.kind) {
    case "event":
      entry = EVENT[props.status];
      break;
    case "booking":
      entry = BOOKING[props.status];
      break;
    case "payment":
      entry = PAYMENT[props.status];
      break;
    case "ticket":
      entry = TICKET[props.status];
      break;
    case "organizer":
      entry = ORGANIZER[props.status];
      break;
    case "refund":
      entry = REFUND[props.status];
      break;
    case "payout":
      entry = PAYOUT[props.status];
      break;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={entry.tone}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {entry.label}
      </Badge>
      {props.kind === "payment" && props.demo ? (
        <Badge tone="outline" className="font-mono text-[9px] tracking-[0.12em]">
          DEMO
        </Badge>
      ) : null}
    </span>
  );
}
