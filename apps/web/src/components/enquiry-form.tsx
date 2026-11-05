"use client";

import * as React from "react";
import { Check, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { useErrorText } from "@/i18n/errors";
import { fieldErrors, postJson } from "@/lib/api-client";
import { ltr, whatsappHref } from "@/lib/site";
import { buildEnquiryMessage, type EnquiryDetails } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<"name" | "phone" | "message", string>>;

/**
 * Saves the enquiry to the store, then offers to send it on WhatsApp as well.
 */
export function EnquiryForm({
  withTopic = false,
  title,
  submitLabel,
  messagePlaceholder,
  className,
}: {
  withTopic?: boolean;
  title?: string;
  submitLabel?: string;
  messagePlaceholder?: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("Enquiry");
  const tc = useTranslations("Common");
  const tSite = useTranslations("Site");
  const errorText = useErrorText();
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
      locale,
      [HONEYPOT_FIELD]: String(f.get(HONEYPOT_FIELD) ?? "") || undefined,
    };

    const check = createEnquirySchema.safeParse(enquiry);
    if (!check.success) {
      setErrors(
        fieldErrors(
          check.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          errorText,
        ),
      );
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    const res = await postJson<{ received: true }>("/enquiries", enquiry);
    setSubmitting(false);

    if (res.ok) setSent(details);
    else if (res.status === 400) setErrors(fieldErrors(res.body.issues, errorText));
    else if (res.status === 429) setFormError(t("tooMany"));
    else setFormError(t("failed"));
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
        <h2 className="display text-3xl">{t("thanksTitle", { name: sent.name.split(" ")[0] })}</h2>
        <p className="text-body">
          {t("thanksText", { phone: ltr(sent.phone), replyTime: tSite("replyTime") })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={whatsappHref(buildEnquiryMessage(sent))} target="_blank" rel="noreferrer">
              <MessageCircle /> {tc("sendOnWhatsApp")}
            </a>
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => setSent(null)}>
            {t("another")}
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
      <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
        <label htmlFor={ids.hp}>{tc("leaveEmpty")}</label>
        <input id={ids.hp} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.name}>{tc("fullName")}</Label>
        <Input id={ids.name} name="name" autoComplete="name" aria-invalid={!!errors.name} onChange={clear("name")} />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.phone}>{tc("phone")}</Label>
        <Input
          id={ids.phone}
          name="phone"
          type="tel"
          dir="ltr"
          className="text-start rtl:text-end"
          autoComplete="tel"
          placeholder="+961"
          aria-invalid={!!errors.phone}
          onChange={clear("phone")}
        />
        {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
      </div>
      <div className={cn("grid gap-2", !withTopic && "sm:col-span-2")}>
        <Label htmlFor={ids.role}>{t("role")}</Label>
        <NativeSelect id={ids.role} name="role">
          {enquiryRoles.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {withTopic ? (
        <div className="grid gap-2">
          <Label htmlFor={ids.topic}>{t("topic")}</Label>
          <NativeSelect id={ids.topic} name="topic">
            {enquiryTopics.map((topic) => (
              <option key={topic} value={topic}>
                {t(`topics.${topic}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={ids.msg}>{t("message")}</Label>
        <Textarea
          id={ids.msg}
          name="message"
          rows={4}
          placeholder={messagePlaceholder ?? t("placeholder")}
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
          {t("privacy")}
        </span>
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? t("sending") : (submitLabel ?? t("submit"))}
        </Button>
      </div>
    </form>
  );
}
