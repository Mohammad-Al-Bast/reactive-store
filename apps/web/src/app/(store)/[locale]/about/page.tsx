import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { pageLocale } from "@/i18n/locale";
import { getCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("aboutTitle"),
    description: t("aboutDescription", { store: site.name, years: site.yearsInField }),
  };
}

/** Keys under "About.values" in the message files. */
const values = ["trust", "transparency", "quality", "growth"] as const;

/** Add manufacturer names here to show the "Manufacturers we work with" strip. */
const manufacturers: string[] = [];

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await pageLocale(params);
  const [categories, t, tSite] = await Promise.all([
    getCategories(locale),
    getTranslations({ locale, namespace: "About" }),
    getTranslations({ locale, namespace: "Site" }),
  ]);
  const store = site.name;
  const years = site.yearsInField;
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="container-page grid items-center gap-x-18 gap-y-10 py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow mb-4 text-brand">{t("eyebrow", { store })}</p>
            <h1 className="display mb-6 text-[clamp(2.5rem,5vw,3.9rem)] leading-[1.04]">{t("title", { years })}</h1>
            <p className="mb-4 text-lg text-body">{t("p1", { store, years })}</p>
            <p className="text-lg text-body">{t("p2")}</p>
          </div>
          {/* Replace with a real photo of your team or store: the most trusted image on the page. */}
          <div className="flex h-[440px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#cdbf9f] bg-muted p-6 text-center text-sm text-muted-foreground">
            {t("photoPlaceholder")}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-5 py-22 md:grid-cols-2">
        <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-9">
          <p className="eyebrow text-brand">{t("missionEyebrow")}</p>
          <h2 className="display text-3xl leading-tight">{t("missionTitle")}</h2>
          <p className="text-body">{t("missionP1")}</p>
          <p className="text-body">{t("missionP2")}</p>
        </div>
        <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-9">
          <p className="eyebrow text-brand">{t("visionEyebrow")}</p>
          <h2 className="display text-3xl leading-tight">{t("visionTitle")}</h2>
          <p className="text-body">{t("visionText", { store })}</p>
        </div>
      </section>

      <section className="bg-ink text-[#f3efe6]">
        <div className="container-page py-22">
          <h2 className="display mb-3 text-[clamp(2rem,3.8vw,2.9rem)] leading-[1.1] text-white">{t("valuesTitle")}</h2>
          <p className="mb-11 max-w-2xl text-[17px] text-ink-text">{t("valuesText")}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v} className="flex flex-col gap-2 border-t-2 border-gold pt-5">
                <span className="font-serif text-[26px] text-white">{t(`values.${v}.title`)}</span>
                <span className="text-[15px] text-ink-text">{t(`values.${v}.text`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-x-18 gap-y-8 py-22 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="display mb-4 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.1]">{t("supplyTitle")}</h2>
          <p className="mb-6 text-[17px] text-body">{t("supplyText")}</p>
          <Button asChild size="lg">
            <Link href="/shop">{t("browseAll")}</Link>
          </Button>
        </div>
        <ul>
          {categories.map((c) => (
            <li key={c.slug} className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border py-5">
              <Link href={`/shop/${c.slug}`} className="flex-[1_1_220px] text-[17px] font-semibold hover:text-brand">
                {c.name}
              </Link>
              <span className="flex-[2_1_260px] text-[15px] text-muted-foreground">{c.items}</span>
            </li>
          ))}
        </ul>
      </section>

      {manufacturers.length ? (
        <section className="container-page pb-22">
          <div className="rounded-2xl bg-muted p-[clamp(1.75rem,4vw,3.5rem)]">
            <p className="eyebrow text-brand">{t("manufacturers")}</p>
            <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {manufacturers.map((m) => (
                <li key={m} className="flex h-20 items-center justify-center rounded-lg bg-card font-semibold">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border bg-card">
        <div className="container-page flex max-w-4xl flex-col items-center gap-5 py-24 text-center">
          <p className="eyebrow text-brand">{t("commitmentEyebrow")}</p>
          <p className="font-serif text-[clamp(1.75rem,3.4vw,2.6rem)] font-medium leading-tight">{t("commitmentText")}</p>
          <span className="text-[15px] font-semibold tracking-[0.08em] text-muted-foreground">{tSite("slogan")}</span>
          <Button asChild size="lg" className="mt-3">
            <Link href="/contact">{t("talkToTeam")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
