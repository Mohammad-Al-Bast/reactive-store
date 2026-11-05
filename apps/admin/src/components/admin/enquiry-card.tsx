import { MessageCircle, Phone } from "lucide-react";
import { enquiryRoleSchema, enquiryTopicSchema, type AdminEnquiry } from "@reactive-store/shared";

import { EnquiryHandledButton } from "@/components/admin/enquiry-handled-button";
import { formatWhen, phoneDigits } from "@/lib/admin/format";
import { roleLabels, topicLabels } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export function EnquiryCard({ enquiry: e }: { enquiry: AdminEnquiry }) {
  const role = enquiryRoleSchema.safeParse(e.role);
  const topic = enquiryTopicSchema.safeParse(e.topic);
  const digits = phoneDigits(e.phone);
  return (
    <article className={cn("flex flex-col gap-2.5 rounded-xl border bg-card p-4", e.handledAt ? "border-border opacity-75" : "border-brand/40")}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{e.name}</h3>
        <span className="text-[13px] text-muted-foreground">{formatWhen(e.createdAt)}</span>
      </header>
      <p className="text-[13px] text-muted-foreground">
        {role.success ? roleLabels[role.data] : e.role}
        {topic.success ? ` · ${topicLabels[topic.data]}` : ""}
      </p>
      <p className="whitespace-pre-line text-sm text-body">{e.message}</p>
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-2.5 text-sm">
        <a href={`tel:+${digits}`} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          <Phone aria-hidden="true" className="size-3.5" /> {e.phone}
        </a>
        <a
          href={`https://wa.me/${digits}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          <MessageCircle aria-hidden="true" className="size-3.5" /> WhatsApp
        </a>
        <span className="ml-auto">
          <EnquiryHandledButton id={e.id} handled={!!e.handledAt} />
        </span>
      </footer>
    </article>
  );
}
