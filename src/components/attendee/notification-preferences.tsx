"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  NOTIFICATION_CATEGORIES,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPreferences(loadNotificationPreferences());
  }, []);

  function toggle(key: keyof NotificationPreferences) {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function save() {
    saveNotificationPreferences(preferences);
    window.dispatchEvent(new Event("tickora:notification-preferences"));
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-line rounded-xl border border-line">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <label
            key={category.key}
            className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3.5"
          >
            <span>
              <span className="block text-[12.5px] font-medium text-ink">
                {category.label}
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-4 text-muted">
                {category.description}
              </span>
            </span>
            <input
              type="checkbox"
              checked={preferences[category.key]}
              onChange={() => toggle(category.key)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-700"
              aria-label={category.label}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={save}>
          <Check className="h-3.5 w-3.5" />
          Save preferences
        </Button>
        {saved ? (
          <span className="text-[11px] font-medium text-success">
            Saved on this device.
          </span>
        ) : null}
      </div>

      <Alert tone="info">
        <span className="flex items-start gap-2">
          <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Preferences filter what appears in your notification centre on this
            device. Essential security and service notices are always delivered and
            cannot be switched off.
          </span>
        </span>
      </Alert>
    </div>
  );
}
