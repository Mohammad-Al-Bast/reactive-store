"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { whatsappHref } from "@/lib/site";
import { buildEnquiryMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const roles = [
  "Physiotherapist",
  "Massage or recovery therapist",
  "Hijama / cupping practitioner",
  "Acupuncture practitioner",
  "Clinic or centre",
  "Student or trainee",
  "Individual / family (home care)",
];

const topics = [
  "Product advice",
  "Quote for a practice",
  "Student or group order",
  "Existing order",
  "Warranty or repair",
];

type Errors = Partial<Record<"name" | "phone" | "message", string>>;

/**
 * Sends the enquiry to the store's WhatsApp with everything pre-filled.
 * No server needed; swap `onSubmit` for an API call when you add one.
 */
export function EnquiryForm({
  withTopic = false,
  title,
  submitLabel = "Send on WhatsApp",
  messagePlaceholder = "e.g. a TENS unit for home use, or a table and cupping set for a new practice",
  className,
}: {
  withTopic?: boolean;
  title?: string;
  submitLabel?: string;
  messagePlaceholder?: string;
  className?: string;
}) {
  const [errors, setErrors] = React.useState<Errors>({});
  const ids = { name: React.useId(), phone: React.useId(), role: React.useId(), topic: React.useId(), msg: React.useId() };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      role: String(f.get("role") ?? ""),
      topic: withTopic ? String(f.get("topic") ?? "") : undefined,
      message: String(f.get("message") ?? "").trim(),
    };
    const next: Errors = {};
    if (!data.name) next.name = "Enter your name.";
    if (data.phone.replace(/\D/g, "").length < 7) next.phone = "Enter a phone number we can reach you on.";
    if (!data.message) next.message = "Tell us what you need.";
    setErrors(next);
    if (Object.keys(next).length) return;
    window.open(whatsappHref(buildEnquiryMessage(data)), "_blank", "noopener");
  }

  const clear = (key: keyof Errors) => () => errors[key] && setErrors((e) => ({ ...e, [key]: undefined }));

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className={cn("grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 sm:p-10", className)}
    >
      {title ? <h2 className="display text-3xl sm:col-span-2">{title}</h2> : null}
      <div className="grid gap-2">
        <Label htmlFor={ids.name}>Full name</Label>
        <Input id={ids.name} name="name" autoComplete="name" aria-invalid={!!errors.name} onChange={clear("name")} />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.phone}>Phone / WhatsApp</Label>
        <Input
          id={ids.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+961"
          aria-invalid={!!errors.phone}
          onChange={clear("phone")}
        />
        {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
      </div>
      <div className={cn("grid gap-2", !withTopic && "sm:col-span-2")}>
        <Label htmlFor={ids.role}>I am a…</Label>
        <NativeSelect id={ids.role} name="role">
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </NativeSelect>
      </div>
      {withTopic ? (
        <div className="grid gap-2">
          <Label htmlFor={ids.topic}>Topic</Label>
          <NativeSelect id={ids.topic} name="topic">
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={ids.msg}>What do you need?</Label>
        <Textarea
          id={ids.msg}
          name="message"
          rows={4}
          placeholder={messagePlaceholder}
          aria-invalid={!!errors.message}
          onChange={clear("message")}
        />
        {errors.message ? <p className="text-sm text-destructive">{errors.message}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
        <span className="text-[13px] text-muted-foreground">
          Opens WhatsApp with your message ready to send. We only use your details to reply to you.
        </span>
        <Button type="submit" size="lg">
          <MessageCircle /> {submitLabel}
        </Button>
      </div>
    </form>
  );
}
