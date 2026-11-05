import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { AlertTriangle, CreditCard, Headphones, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AddToCartWithQty } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { StockStatus } from "@/components/stock-status";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pageLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { getCategory, getProduct, getProducts } from "@/lib/catalog";
import { formatPrice, whatsappHref } from "@/lib/site";
import { productEnquiryMessage } from "@/lib/whatsapp";

export async function generateStaticParams() {
  const products = await getProducts(routing.defaultLocale);
  // With cacheComponents at least one param is required; unknown slugs still render on demand.
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "coming-soon" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const product = await getProduct((await params).slug, locale);
  return product ? { title: product.name, description: product.description ?? product.summary } : {};
}

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const product = await getProduct(slug, locale);
  if (!product) notFound();
  const [category, inCategory, english, t, tc, tSite, tAudience] = await Promise.all([
    getCategory(product.category, locale),
    getProducts(locale, product.category),
    // The WhatsApp message to the store names the product in English.
    locale === "en" ? product : getProduct(slug, "en"),
    getTranslations({ locale, namespace: "Product" }),
    getTranslations({ locale, namespace: "Common" }),
    getTranslations({ locale, namespace: "Site" }),
    getTranslations({ locale, namespace: "Audience" }),
  ]);
  if (!category) notFound();
  const bySlug = new Map(inCategory.map((p) => [p.slug, p]));
  const related = (
    await Promise.all((product.related ?? []).map((s) => bySlug.get(s) ?? getProduct(s, locale)))
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const fallbackRelated = inCategory.filter((p) => p.slug !== product.slug).slice(0, 3);
  const alsoBuy = related.length ? related : fallbackRelated;

  const reassurance = [
    { icon: ShieldCheck, title: t("reassurance.warranty"), text: tSite("warranty") },
    { icon: Truck, title: t("reassurance.delivery"), text: tSite("deliveryTime") },
    { icon: CreditCard, title: t("reassurance.payment"), text: t("reassurance.paymentText") },
    { icon: Headphones, title: t("reassurance.help"), text: t("reassurance.helpText") },
  ];

  return (
    <>
      <div className="container-page pt-6">
        <nav aria-label={tc("breadcrumb")} className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {tc("home")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/shop/${category.slug}`} className="hover:text-foreground">
            {category.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground" aria-current="page">
            {product.name}
          </span>
        </nav>
      </div>

      <section className="container-page grid gap-x-14 gap-y-10 pt-6 pb-16 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative min-w-0">
          <ProductImage
            product={product}
            priority
            sizes="(max-width: 1024px) 100vw, 640px"
            className="h-[clamp(320px,50vw,560px)] rounded-2xl"
          />
          {product.badge ? <Badge className="absolute start-4.5 top-4.5">{product.badge}</Badge> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <p className="eyebrow text-brand">
            {category.short} · {product.type}
          </p>
          <h1 className="display text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08]">{product.name}</h1>
          <p className="text-[17px] text-body">{product.description ?? product.summary}</p>
          <div className="flex flex-wrap gap-2">
            {product.audience.map((a) => (
              <Badge key={a} variant="secondary">
                {tAudience(a)}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border py-5">
            <span className={product.price == null ? "text-2xl font-bold" : "text-[34px] font-bold tracking-tight"}>
              {formatPrice(product.price, tc("priceOnRequest"))}
            </span>
            <StockStatus stock={product.stock} className="text-sm" />
          </div>
          <AddToCartWithQty slug={product.slug} name={product.name} />
          <Button asChild variant="outline" size="lg">
            <a
              href={whatsappHref(productEnquiryMessage(english?.name ?? product.name))}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> {t("whatsappCta")}
            </a>
          </Button>
          <ul className="grid gap-x-5 gap-y-3.5 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
            {reassurance.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-2.5">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-brand" strokeWidth={1.7} />
                <span>
                  <strong className="block">{title}</strong>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {product.modes || product.inTheBox || product.specs ? (
        <section className="border-y border-border bg-card">
          <div className="container-page grid gap-x-18 gap-y-12 py-18 lg:grid-cols-2">
            <div>
              {product.modes ? (
                <>
                  <h2 className="display mb-5 text-[34px]">{t("whatItDoes")}</h2>
                  <dl className="mb-7 flex flex-col gap-3.5">
                    {product.modes.map((m) => (
                      <div key={m.name}>
                        <dt className="font-bold">{m.name}</dt>
                        <dd className="mt-0.5 text-body">{m.text}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}
              {product.inTheBox ? (
                <>
                  <h3 className="mb-3 text-lg font-bold">{t("inTheBox")}</h3>
                  <ul className="flex list-disc flex-col gap-1.5 ps-5 text-body">
                    {product.inTheBox.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
            {product.specs ? (
              <div>
                <h2 className="display mb-5 text-[34px]">{t("specifications")}</h2>
                <dl className="border-t border-[#efebe2] text-[15px]">
                  {product.specs.map((s) => (
                    <div key={s.label} className="grid grid-cols-2 gap-4 border-b border-[#efebe2] py-3.5">
                      <dt className="font-semibold">{s.label}</dt>
                      <dd className="text-body">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {product.safety ? (
        <section className="container-page pt-14">
          <div className="flex items-start gap-4.5 rounded-2xl border border-[#e8d3a6] bg-warning-soft p-7">
            <AlertTriangle aria-hidden="true" className="size-7 shrink-0 text-warning" />
            <div>
              <h2 className="mb-2 text-lg font-bold">{t("safety")}</h2>
              <p className="text-[15px] text-body">{product.safety}</p>
            </div>
          </div>
        </section>
      ) : null}

      {product.faq ? (
        <section className="container-page pt-14">
          <h2 className="display mb-5 text-[34px]">{t("questions")}</h2>
          <Accordion type="single" collapsible defaultValue="q0" className="flex flex-col gap-2.5">
            {product.faq.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      {alsoBuy.length ? (
        <section className="container-page pt-18 pb-22">
          <h2 className="display mb-6 text-[34px]">{related.length ? t("boughtTogether") : t("moreInDepartment")}</h2>
          <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {alsoBuy.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : (
        <div className="pb-22" />
      )}
    </>
  );
}
