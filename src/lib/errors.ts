export function friendlyDbError(
  error: { message?: string; code?: string } | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  const message = error.message ?? "";

  const known: Array<[string, string]> = [
    [
      "INSUFFICIENT_INVENTORY",
      "Some tickets were taken while you were choosing. Please adjust your quantities.",
    ],
    ["SALES_CLOSED", "Ticket sales for this event are not open."],
    ["SALES_ENDED", "Ticket sales have ended for this event."],
    ["EVENT_NOT_AVAILABLE", "This event is not currently accepting bookings."],
    ["BOOKING_EXPIRED", "Your reservation expired. Please start a new booking."],
    ["BOOKING_NOT_PAYABLE", "This booking can no longer be paid."],
    ["PAYMENT_ALREADY_COMPLETE", "This booking has already been paid."],
    ["ALREADY_CHECKED_IN", "This ticket has already been checked in."],
    ["INVALID_TICKET", "This ticket could not be verified."],
    ["WRONG_EVENT", "This ticket belongs to a different event."],
    ["TICKET_NOT_VALID", "This ticket is no longer valid."],
    ["NOT_AUTHORIZED", "You are not authorized to perform this action."],
    ["AUTH_REQUIRED", "Please sign in to continue."],
    ["RATE_LIMITED", "Too many attempts. Please wait a moment."],
    ["PAYOUT_EXCEEDS_BALANCE", "The requested amount exceeds your available balance."],
    ["PAYOUT_BELOW_MINIMUM", "The requested amount is below the minimum payout."],
    ["ORGANIZER_NOT_APPROVED", "Your organizer account must be approved first."],
    ["INVALID_STATE", "This action is not available in the current state."],
    ["CHECK_IN_NOT_AUTHORIZED", "You are not assigned to scan this event."],
  ];

  for (const [code, friendly] of known) {
    if (message.includes(code)) return friendly;
  }

  if (error.code === "23505") return "That record already exists.";
  if (error.code === "42501") return "You do not have permission to do that.";
  if (error.code === "PGRST116") return "Record not found.";

  // Never leak raw database internals to the browser in production.
  if (process.env.NODE_ENV !== "production" && message) return message;
  return fallback;
}
