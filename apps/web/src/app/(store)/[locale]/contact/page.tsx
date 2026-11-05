import type { Metadata } from "next";
import { ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EnquiryForm } from "@/components/enquiry-form";
import { pageLocale } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ltr, site, telHref, whatsappHref } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("contactTitle"),
    description: t("contactDescription", { store: site.name, phone: ltr(site.phoneDisplay) }),
  };
}

/** Keys under "Contact.faq" in the message files. */
const faq = ["delivery", "payment", "warranty", "returns", "bulk", "students"] as const;

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = await pageLocale(params);
  const [t, tSite] = await Promise.all([
    getTranslations({ locale, namespace: "Contact" }),
    getTranslations({ locale, namespace: "Site" }),
  ]);
  const phone = ltr(site.phoneDisplay);
  const cards = [
    { icon: MessageCircle, title: t("whatsapp"), text: t("whatsappText", { phone }), href: whatsappHref(), dark: true },
    { icon: Phone, title: t("call"), text: phone, href: telHref },
    { icon: Mail, title: t("email"), text: site.email, href: site.email.includes("@") ? `mailto:${site.email}` : undefined },
    { icon: MapPin, title: t("visit"), text: tSite("address"), href: site.mapUrl },
  ];

  return (
    <>
      <section className="container-page pt-18 pb-10">
        <h1 className="display mb-3.5 text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.05]">{t("title")}</h1>
        <p className="mb-10 max-w-xl text-lg text-body">{t("intro", { replyTime: tSite("replyTime") })}</p>
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
        <EnquiryForm withTopic title={t("formTitle")} messagePlaceholder={t("formPlaceholder")} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-1 flex-col justify-between gap-6 rounded-2xl bg-ink p-7 text-white">
            <div className="flex flex-col gap-3">
              <MapPin aria-hidden="true" className="size-8 text-gold" strokeWidth={1.6} />
              <h2 className="font-serif text-[26px] font-medium leading-tight">{t("visitTitle")}</h2>
              <p className="text-ink-text">{tSite("address")}</p>
            </div>
            <Button asChild variant="accent" size="lg" className="w-fit">
              <a href={site.mapUrl} target="_blank" rel="noreferrer">
                {t("openMaps")} <ExternalLink />
              </a>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-[17px] font-bold">{t("hoursTitle")}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
              {site.hours.map((h) => (
                <div key={h} className="contents">
                  <dt className="text-muted-foreground">{tSite(`hours.${h}.days`)}</dt>
                  <dd>
                    <bdi dir="ltr">{tSite(`hours.${h}.time`)}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-4 border-t border-border bg-card">
        <div className="container-page max-w-4xl py-20">
          <h2 className="display mb-7 text-[clamp(2rem,3.6vw,2.75rem)]">{t("faqTitle")}</h2>
          <Accordion type="single" collapsible className="flex flex-col gap-2.5">
            {faq.map((f) => (
              <AccordionItem key={f} value={f} className="bg-background">
                <AccordionTrigger>{t(`faq.${f}.q`)}</AccordionTrigger>
                <AccordionContent>{t(`faq.${f}.a`, { store: site.name })}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
