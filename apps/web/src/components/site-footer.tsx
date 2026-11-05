import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import type { Category } from "@/lib/products";
import { site, telHref } from "@/lib/site";

export function SiteFooter({ categories }: { categories: Category[] }) {
  const t = useTranslations("Footer");
  const tSite = useTranslations("Site");
  const year = 2026;
  return (
    <footer className="bg-ink text-sm text-ink-text">
      <div className="container-page grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="" width={48} height={48} className="size-12 rounded-full" />
            <span className="font-serif text-[22px] text-white">{site.name}</span>
          </div>
          <p className="max-w-72">{tSite("slogan")}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="mb-1 font-semibold text-white">{t("shop")}</h2>
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className="hover:text-gold">
              {c.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="mb-1 font-semibold text-white">{t("company")}</h2>
          <Link href="/about" className="hover:text-gold">
            {t("about")}
          </Link>
          <Link href="/contact#faq" className="hover:text-gold">
            {t("warranty")}
          </Link>
          <Link href="/contact#faq" className="hover:text-gold">
            {t("delivery")}
          </Link>
          <Link href="/contact" className="hover:text-gold">
            {t("contact")}
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="mb-1 font-semibold text-white">{t("visit")}</h2>
          <a href={site.mapUrl} target="_blank" rel="noreferrer" className="hover:text-gold">
            {tSite("address")}
          </a>
          <a href={`mailto:${site.email}`} className="break-all hover:text-gold">
            {site.email}
          </a>
          {site.hours.map((h) => (
            <span key={h}>
              {tSite(`hours.${h}.days`)}: <bdi dir="ltr">{tSite(`hours.${h}.time`)}</bdi>
            </span>
          ))}
          <a href={telHref} className="font-semibold text-white hover:text-gold">
            <bdi dir="ltr">{site.phoneDisplay}</bdi>
          </a>
          {site.social.instagram ? (
            <a href={site.social.instagram} className="hover:text-gold" target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
          {site.social.facebook ? (
            <a href={site.social.facebook} className="hover:text-gold" target="_blank" rel="noreferrer">
              Facebook
            </a>
          ) : null}
        </div>
      </div>
      <div className="container-page flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-ink-line py-6 text-[13px] text-[#a9a397]">
        <span>{t("rights", { year, store: site.name })}</span>
        <span className="max-w-160">{t("disclaimer")}</span>
      </div>
    </footer>
  );
}
