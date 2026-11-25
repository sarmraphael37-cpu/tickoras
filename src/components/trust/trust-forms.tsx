"use client";

import { useActionState, useState } from "react";
import { Flag, ShieldCheck, Star } from "lucide-react";
import {
  moderateReview,
  reportReview,
  reviewVerification,
  submitComplaint,
  submitReview,
  submitVerificationRequest,
  updateComplaintStatus,
} from "@/app/actions/trust";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function Messages({ state }: { state: ActionState }) {
  if (state.status === "error") return <Alert tone="danger">{state.message}</Alert>;
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return null;
}

// ---------------------------------------------------------------------------
// Verification application
// ---------------------------------------------------------------------------

export function VerificationForm({
  subjectType,
  subjectId,
}: {
  subjectType: "organizer" | "service_provider";
  subjectId: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitVerificationRequest,
    initialActionState,
  );
  const [docs, setDocs] = useState<Array<{ label: string; url: string }>>([
    { label: "", url: "" },
  ]);

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        fd.set(
          "documents",
          JSON.stringify(docs.filter((d) => d.label.trim() && d.url.trim())),
        );
      }}
    >
      <input type="hidden" name="subject_type" value={subjectType} />
      <input type="hidden" name="subject_id" value={subjectId} />

      <div className="space-y-2">
        <Label>Supporting documents</Label>
        <p className="text-[10.5px] text-muted">
          Provide links to business registration, ID, or portfolio documents.
          URLs only — files stay in your own storage.
        </p>
        {docs.map((doc, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <Input
              placeholder="Document label (e.g. Business reg.)"
              value={doc.label}
              onChange={(e) =>
                setDocs((prev) =>
                  prev.map((d, j) =>
                    j === i ? { ...d, label: e.target.value } : d,
                  ),
                )
              }
            />
            <Input
              placeholder="https://…"
              value={doc.url}
              onChange={(e) =>
                setDocs((prev) =>
                  prev.map((d, j) =>
                    j === i ? { ...d, url: e.target.value } : d,
                  ),
                )
              }
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
              disabled={docs.length === 1}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDocs((prev) => [...prev, { label: "", url: "" }])}
        >
          + Add document
        </Button>
      </div>

      <div>
        <Label htmlFor="verif-notes">Notes for reviewers (optional)</Label>
        <Textarea
          id="verif-notes"
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="Tell us about your business…"
        />
      </div>

      <Button type="submit" loading={pending}>
        <ShieldCheck className="h-4 w-4" />
        {pending ? "Submitting…" : "Submit verification"}
      </Button>
      <Messages state={state} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Star rating input + review form
// ---------------------------------------------------------------------------

export function ReviewForm({
  targetType,
  targetId,
  bookingId,
}: {
  targetType: "event" | "organizer";
  targetId: string;
  bookingId?: string;
}) {
  const [pending, setPending] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setPending(true);
    setMessage(null);
    const res = await submitReview(targetType, targetId, rating, comment, bookingId);
    setPending(false);
    if (res.status === "error") {
      setMessage({ tone: "danger", text: res.message ?? "Could not submit review." });
    } else {
      setMessage({ tone: "success", text: "Review published. Thank you!" });
      setRating(0);
      setComment("");
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <div>
        <Label>Your rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
              aria-label={`${n} stars`}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition",
                  n <= (hover || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-line",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor={`review-${targetId}`}>Review (optional)</Label>
        <Textarea
          id={`review-${targetId}`}
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience…"
        />
      </div>
      <Button type="submit" size="sm" loading={pending} disabled={rating === 0}>
        {pending ? "Publishing…" : "Publish review"}
      </Button>
      {message ? (
        <Alert tone={message.tone}>{message.text}</Alert>
      ) : null}
      <p className="text-[10px] text-muted">
        Reviews require a confirmed booking for this event.
      </p>
    </form>
  );
}

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      disabled={done}
      onClick={async () => {
        setPending(true);
        const res = await reportReview(reviewId);
        setPending(false);
        if (res.status !== "error") setDone(true);
      }}
    >
      <Flag className="h-3 w-3" /> {done ? "Reported" : "Report"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Complaint form
// ---------------------------------------------------------------------------

export function ComplaintForm({
  organizerId,
  eventId,
  serviceBookingId,
}: {
  organizerId?: string | null;
  eventId?: string | null;
  serviceBookingId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitComplaint, initialActionState);
  return (
    <form action={formAction} className="space-y-3">
      {organizerId ? <input type="hidden" name="organizer_id" value={organizerId} /> : null}
      {eventId ? <input type="hidden" name="event_id" value={eventId} /> : null}
      {serviceBookingId ? (
        <input type="hidden" name="service_booking_id" value={serviceBookingId} />
      ) : null}
      <div>
        <Label htmlFor="cmp-subject">Subject</Label>
        <Input id="cmp-subject" name="subject" required maxLength={160}
          placeholder="e.g. Ticket not scanned at entrance" />
      </div>
      <div>
        <Label htmlFor="cmp-desc">Describe the issue</Label>
        <Textarea id="cmp-desc" name="description" required rows={4} maxLength={4000}
          placeholder="What happened? Include dates, booking references, names…" />
      </div>
      <Button type="submit" loading={pending}>
        {pending ? "Submitting…" : "Submit complaint"}
      </Button>
      <Messages state={state} />
      <p className="text-[10px] text-muted">
        You&apos;ll get a reference number and can track status under Attendee → Complaints.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

export function VerificationReviewButtons({
  requestId,
}: {
  requestId: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  async function act(status: "approved" | "rejected" | "info_requested" | "suspended") {
    setPending(status);
    await reviewVerification(requestId, status);
    setPending(null);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" onClick={() => void act("approved")} disabled={pending !== null}>
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => void act("info_requested")} disabled={pending !== null}>
        Request info
      </Button>
      <Button size="sm" variant="outline" onClick={() => void act("rejected")} disabled={pending !== null}>
        Reject
      </Button>
      <Button size="sm" variant="outline" onClick={() => void act("suspended")} disabled={pending !== null}>
        Suspend
      </Button>
    </div>
  );
}

export function ComplaintStatusButtons({
  complaintId,
  status,
}: {
  complaintId: string;
  status: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  async function act(s: "open" | "investigating" | "resolved" | "rejected") {
    setPending(s);
    await updateComplaintStatus(complaintId, s);
    setPending(null);
  }
  const options = (
    [
      ["open", "Reopen"],
      ["investigating", "Investigating"],
      ["resolved", "Resolve"],
      ["rejected", "Reject"],
    ] as const
  ).filter(([s]) => s !== status);
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "open" && status !== "investigating" ? null : null}
      {options.slice(0, 3).map(([s, label]) => (
        <Button
          key={s}
          size="sm"
          variant="outline"
          onClick={() => void act(s)}
          disabled={pending !== null}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

export function ReviewModerationButtons({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  async function act(s: "published" | "rejected") {
    setPending(true);
    await moderateReview(reviewId, s);
    setPending(false);
  }
  return (
    <div className="flex gap-1.5">
      {status !== "published" ? (
        <Button size="sm" variant="outline" onClick={() => void act("published")} disabled={pending}>
          Publish
        </Button>
      ) : null}
      {status !== "rejected" ? (
        <Button size="sm" variant="outline" onClick={() => void act("rejected")} disabled={pending}>
          Reject
        </Button>
      ) : null}
      <Badge tone={status === "published" ? "success" : status === "reported" ? "warning" : "neutral"}>
        {status}
      </Badge>
    </div>
  );
}
