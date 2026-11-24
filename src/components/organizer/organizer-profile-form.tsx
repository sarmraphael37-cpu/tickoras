"use client";

import { useActionState } from "react";
import { updateOrganizerProfile } from "@/app/actions/organizer";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";
import { CITIES } from "@/lib/domain";

export function OrganizerProfileForm({
  organizerId,
  defaults,
}: {
  organizerId: string;
  defaults: {
    name: string;
    description: string;
    email: string;
    phone: string;
    city: string;
    logoUrl: string;
    bannerUrl: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganizerProfile,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
        <ImageUpload
          bucket="event-media"
          folder={organizerId}
          name="logo_url"
          defaultValue={defaults.logoUrl}
          label="Logo"
          hint="Square image, at least 400 × 400 px."
          previewClassName="aspect-square"
        />
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaults.name}
              minLength={2}
              maxLength={120}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Contact email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaults.email}
                placeholder="bookings@yourbrand.cm"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={defaults.phone}
                placeholder="+237 6XX XXX XXX"
                maxLength={30}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="city">Based in</Label>
            <Select id="city" name="city" defaultValue={defaults.city}>
              <option value="">Not specified</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="description">About your organization</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaults.description}
          placeholder="Tell attendees who you are and the kind of experiences you produce."
          className="min-h-[140px]"
          maxLength={2000}
        />
      </div>

      <ImageUpload
        bucket="event-media"
        folder={organizerId}
        name="banner_url"
        defaultValue={defaults.bannerUrl}
        label="Public banner"
        hint="Shown on your public organizer page. Wide images (2.5:1) work best."
        previewClassName="aspect-[16/6]"
      />

      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save organizer profile"}
      </Button>

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
    </form>
  );
}
