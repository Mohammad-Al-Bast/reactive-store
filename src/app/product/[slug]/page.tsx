import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CreditCard, Headphones, MessageCircle, ShieldCheck, Truck } from "lucide-react";

import { AddToCartWithQty } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { StockStatus } from "@/components/stock-status";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { audienceLabel, getCategory, getProduct, products } from "@/lib/products";
import { formatPrice, site, whatsappHref } from "@/lib/site";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const product = getProduct((await params).slug);
  return product ? { title: product.name, description: product.description ?? product.summary } : {};
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const category = getCategory(product.category)!;
  const related = (product.related ?? [])
    .map((s) => getProduct(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const fallbackRelated = products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 3);
  const alsoBuy = related.length ? related : fallbackRelated;

  const reassurance = [
    { icon: ShieldCheck, title: "Warranty", text: site.warranty },
    { icon: Truck, title: "Delivery", text: site.deliveryTime },
    { icon: CreditCard, title: "Payment", text: site.paymentMethods.map((m) => m.name).join(", ") },
    { icon: Headphones, title: "Help using it", text: "We show you how, by call or WhatsApp" },
  ];

  return (
    <>
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
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
          {product.badge ? <Badge className="absolute left-4.5 top-4.5">{product.badge}</Badge> : null}
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
                {audienceLabel[a]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border py-5">
            <span className={product.price == null ? "text-2xl font-bold" : "text-[34px] font-bold tracking-tight"}>
              {formatPrice(product.price)}
            </span>
            <StockStatus stock={product.stock} className="text-sm" />
          </div>
          <AddToCartWithQty slug={product.slug} name={product.name} />
          <Button asChild variant="outline" size="lg">
            <a
              href={whatsappHref(`Hello ${site.name}, I'm interested in the ${product.name}.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Order or ask on WhatsApp
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
                  <h2 className="display mb-5 text-[34px]">What it does</h2>
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
                  <h3 className="mb-3 text-lg font-bold">In the box</h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body">
                    {product.inTheBox.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
            {product.specs ? (
              <div>
                <h2 className="display mb-5 text-[34px]">Specifications</h2>
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
              <h2 className="mb-2 text-lg font-bold">Safety information</h2>
              <p className="text-[15px] text-body">{product.safety}</p>
            </div>
          </div>
        </section>
      ) : null}

      {product.faq ? (
        <section className="container-page pt-14">
          <h2 className="display mb-5 text-[34px]">Questions</h2>
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
          <h2 className="display mb-6 text-[34px]">{related.length ? "Often bought together" : "More in this department"}</h2>
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
