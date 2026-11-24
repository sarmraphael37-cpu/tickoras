"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import { initialActionState } from "@/lib/action-state";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ProfileForm({
  userId,
  defaultName,
  defaultPhone,
  defaultAvatar,
  email,
}: {
  userId: string;
  defaultName: string;
  defaultPhone: string;
  defaultAvatar: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <ImageUpload
        bucket="profile-avatars"
        folder={userId}
        name="avatar_url"
        defaultValue={defaultAvatar}
        label="Profile photo"
        hint="A clear portrait helps organizers recognise you at the door."
        previewClassName="aspect-[4/3] max-w-[280px]"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={defaultName}
            minLength={2}
            maxLength={120}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultPhone}
            maxLength={30}
            placeholder="+237 6XX XXX XXX"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email address</Label>
        <Input id="email" value={email} readOnly disabled />
        <p className="mt-1.5 text-[10.5px] text-muted">
          Email changes are handled by authentication. Contact support if you need
          to move your account.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="mt-1.5 text-[10.5px] text-muted">
            At least 8 characters with a letter and a number.
          </p>
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>
      <Button type="submit" loading={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
    </form>
  );
}
