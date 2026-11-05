import type { Metadata } from "next";
import { ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { EnquiryForm } from "@/components/enquiry-form";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { site, telHref, whatsappHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Call or WhatsApp ${site.name} on ${site.phoneDisplay} for product advice, quotes and orders.`,
};

const faq = [
  {
    q: "Where do you deliver, and how long does it take?",
    a: "We deliver across Lebanon. Delivery time depends on your location, generally 3–5 days.",
  },
  { q: "How can I pay?", a: "Cash on delivery, or by Whish / OMT transfer before dispatch." },
  {
    q: "Do devices come with a warranty?",
    a: `Warranty availability, duration and coverage vary by product. Please contact ${site.name} before purchasing to confirm whether your item includes a warranty and to learn its terms and conditions.`,
  },
  {
    q: "Can I return a product?",
    a: "Returns may be accepted for incorrect or faulty items after review. For hygiene reasons, opened or used single-use and personal-care products cannot be returned unless faulty or supplied incorrectly.",
  },
  { q: "Do you offer prices for clinics or bulk orders?", a: "Yes. Send us your list and we prepare one combined quote." },
  { q: "Do you offer anything for students?", a: "Yes, we have offers for students and for group orders. Ask us for details." },
];

export default function ContactPage() {
  const cards = [
    { icon: MessageCircle, title: "WhatsApp", text: `${site.phoneDisplay} · fastest reply`, href: whatsappHref(), dark: true },
    { icon: Phone, title: "Call us", text: site.phoneDisplay, href: telHref },
    { icon: Mail, title: "Email", text: site.email, href: site.email.includes("@") ? `mailto:${site.email}` : undefined },
    { icon: MapPin, title: "Visit", text: site.address, href: site.mapUrl },
  ];

  return (
    <>
      <section className="container-page pt-18 pb-10">
        <h1 className="display mb-3.5 text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.05]">Talk to a real person.</h1>
        <p className="mb-10 max-w-xl text-lg text-body">
          Questions about a product, an order, or what you need for your practice or studies? We usually reply within{" "}
          {site.replyTime}.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, text, href, dark }) => {
            const inner = (
              <>
                <Icon aria-hidden="true" className={`size-7 ${dark ? "text-gold" : "text-brand"}`} strokeWidth={1.7} />
                <span className="text-[17px] font-bold">{title}</span>
                <span className={`[overflow-wrap:anywhere] ${dark ? "text-ink-text" : "text-muted-foreground"}`}>{text}</span>
              </>
            );
            const cls = `flex h-full flex-col gap-2.5 rounded-2xl p-6 ${dark ? "bg-ink text-white hover:bg-ink-raised" : "border border-border bg-card hover:border-[#cdbf9f]"}`;
            return (
              <li key={title}>
                {href ? (
                  <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {inner}
                  </a>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="container-page grid gap-8 pt-6 pb-18 lg:grid-cols-[1.4fr_1fr]">
        <EnquiryForm withTopic title="Send us a message" messagePlaceholder="How can we help?" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-1 flex-col justify-between gap-6 rounded-2xl bg-ink p-7 text-white">
            <div className="flex flex-col gap-3">
              <MapPin aria-hidden="true" className="size-8 text-gold" strokeWidth={1.6} />
              <h2 className="font-serif text-[26px] font-medium leading-tight">Visit our store</h2>
              <p className="text-ink-text">{site.address}</p>
            </div>
            <Button asChild variant="accent" size="lg" className="w-fit">
              <a href={site.mapUrl} target="_blank" rel="noreferrer">
                Open in Google Maps <ExternalLink />
              </a>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-[17px] font-bold">Opening hours</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
              {site.hours.map((h) => (
                <div key={h.days} className="contents">
                  <dt className="text-muted-foreground">{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-4 border-t border-border bg-card">
        <div className="container-page max-w-4xl py-20">
          <h2 className="display mb-7 text-[clamp(2rem,3.6vw,2.75rem)]">Delivery, payment &amp; warranty</h2>
          <Accordion type="single" collapsible className="flex flex-col gap-2.5">
            {faq.map((f, i) => (
              <AccordionItem key={f.q} value={`f${i}`} className="bg-background">
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
