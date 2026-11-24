"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/actions/contact";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessage, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            placeholder="e.g. Ada Nkeng"
          />
          {state.fieldErrors?.name ? (
            <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.name[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="contact-email">Email address</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.email[0]}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="contact-subject">What is this about?</Label>
        <Select id="contact-subject" name="subject" defaultValue="general">
          <option value="general">General question</option>
          <option value="tickets">My tickets or a booking</option>
          <option value="payments">Payments and refunds</option>
          <option value="organizers">Organizer support</option>
          <option value="press">Press and partnerships</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          maxLength={3000}
          placeholder="Give us the details — event name, booking reference or what you need help with."
        />
        {state.fieldErrors?.message ? (
          <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.message[0]}</p>
        ) : null}
      </div>

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? <Alert tone="success">{state.message}</Alert> : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Send message
      </Button>
      <p className="text-[10px] leading-5 text-muted">
        By sending this message you agree to our{" "}
        <a href="/privacy" className="underline underline-offset-2">
          privacy policy
        </a>
        . We use your details only to respond to this enquiry.
      </p>
    </form>
  );
}
