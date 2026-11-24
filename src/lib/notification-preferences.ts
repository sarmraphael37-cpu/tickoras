/**
 * Device-level notification display preferences. These control which types of
 * notices are shown in the notification centre. TICKORA service notices are
 * always delivered and cannot be hidden.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    key: "booking",
    label: "Booking updates",
    description: "Reservations, confirmations and order changes.",
  },
  {
    key: "payment",
    label: "Payment updates",
    description: "Payment successes and failures.",
  },
  {
    key: "ticket",
    label: "Ticket issued",
    description: "When a new QR ticket is added to your wallet.",
  },
  {
    key: "event",
    label: "Event reminders & changes",
    description: "Upcoming events and schedule updates.",
  },
  {
    key: "refund",
    label: "Refund updates",
    description: "Refund requests, approvals and settlement.",
  },
] as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[number]["key"];

export type NotificationPreferences = Record<NotificationCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  booking: true,
  payment: true,
  ticket: true,
  event: true,
  refund: true,
};

const STORAGE_KEY = "tickora.notification.preferences.v1";

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      booking: parsed.booking !== false,
      payment: parsed.payment !== false,
      ticket: parsed.ticket !== false,
      event: parsed.event !== false,
      refund: parsed.refund !== false,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage may be unavailable in private browsing; preferences stay in memory.
  }
}

/** Map a stored notification row to one of the preference categories. */
export function categoryForNotification(type: string, title: string): NotificationCategory | null {
  const haystack = `${type} ${title}`.toLowerCase();
  if (haystack.includes("refund")) return "refund";
  if (haystack.includes("payment") || haystack.includes("paid")) return "payment";
  if (haystack.includes("ticket") || haystack.includes("qr")) return "ticket";
  if (
    haystack.includes("event") ||
    haystack.includes("reminder") ||
    haystack.includes("schedule")
  ) {
    return "event";
  }
  if (haystack.includes("booking") || haystack.includes("reservation")) {
    return "booking";
  }
  return null;
}
