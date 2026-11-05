"use client";

import * as React from "react";
import { Check, MessageCircle } from "lucide-react";
import { useLocale } from "next-intl";
import {
  createEnquirySchema,
  enquiryRoles,
  enquiryTopics,
  HONEYPOT_FIELD,
  type CreateEnquiryInput,
  type EnquiryRole,
  type EnquiryTopic,
} from "@reactive-store/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrors, postJson } from "@/lib/api-client";
import { site, whatsappHref } from "@/lib/site";
import { buildEnquiryMessage, roleLabels, topicLabels, type EnquiryDetails } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<"name" | "phone" | "message", string>>;

/**
 * Saves the enquiry to the store, then offers to send it on WhatsApp as well.
 */
export function EnquiryForm({
  withTopic = false,
  title,
  submitLabel = "Send message",
  messagePlaceholder = "e.g. a TENS unit for home use, or a table and cupping set for a new practice",
  className,
}: {
  withTopic?: boolean;
  title?: string;
  submitLabel?: string;
  messagePlaceholder?: string;
  className?: string;
}) {
  const locale = useLocale();
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState<EnquiryDetails | null>(null);
  const ids = {
    name: React.useId(),
    phone: React.useId(),
    role: React.useId(),
    topic: React.useId(),
    msg: React.useId(),
    hp: React.useId(),
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const f = new FormData(e.currentTarget);
    const details: EnquiryDetails = {
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      role: String(f.get("role") ?? "") as EnquiryRole,
      topic: withTopic ? (String(f.get("topic") ?? "") as EnquiryTopic) : undefined,
      message: String(f.get("message") ?? "").trim(),
    };
    const enquiry: CreateEnquiryInput = {
      ...details,
      locale: locale as CreateEnquiryInput["locale"],
      [HONEYPOT_FIELD]: String(f.get(HONEYPOT_FIELD) ?? "") || undefined,
    };

    const check = createEnquirySchema.safeParse(enquiry);
    if (!check.success) {
      setErrors(fieldErrors(check.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    const res = await postJson<{ received: true }>("/enquiries", enquiry);
    setSubmitting(false);

    if (res.ok) setSent(details);
    else if (res.status === 400) setErrors(fieldErrors(res.body.issues));
    else if (res.status === 429) setFormError("Too many messages. Please wait a few minutes, or message us on WhatsApp.");
    else setFormError("We couldn't send your message. Try again, or message us on WhatsApp.");
  }

  const clear = (key: keyof Errors) => () => errors[key] && setErrors((e) => ({ ...e, [key]: undefined }));

  if (sent) {
    return (
      <div
        role="status"
        className={cn("flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 sm:p-10", className)}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-[#e6f0e9]">
          <Check aria-hidden="true" className="size-6 text-success" strokeWidth={2.2} />
        </span>
        <h2 className="display text-3xl">Thank you, {sent.name.split(" ")[0]}.</h2>
        <p className="text-body">
          We have your message and will reply to {sent.phone} within {site.replyTime}. For a faster answer, you can also
          send it to us on WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={whatsappHref(buildEnquiryMessage(sent))} target="_blank" rel="noreferrer">
              <MessageCircle /> Send on WhatsApp
            </a>
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => setSent(null)}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className={cn("relative grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 sm:p-10", className)}
    >
      {title ? <h2 className="display text-3xl sm:col-span-2">{title}</h2> : null}
      {/* Honeypot: hidden from people, so only bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor={ids.hp}>Leave this empty</label>
        <input id={ids.hp} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
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
          {enquiryRoles.map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {withTopic ? (
        <div className="grid gap-2">
          <Label htmlFor={ids.topic}>Topic</Label>
          <NativeSelect id={ids.topic} name="topic">
            {enquiryTopics.map((t) => (
              <option key={t} value={t}>
                {topicLabels[t]}
              </option>
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
      {formError ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
        <span className="text-[13px] text-muted-foreground">
          We only use your details to reply to you.
        </span>
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Sending…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
