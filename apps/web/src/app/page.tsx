import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Globe,
  GraduationCap,
  HeartHandshake,
  Home as HomeIcon,
  Phone,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Tags,
} from "lucide-react";

import { CategoryIcon } from "@/components/category-icon";
import { EnquiryForm } from "@/components/enquiry-form";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categories, products } from "@/lib/products";
import { site, telHref } from "@/lib/site";

const standards = [
  { icon: Globe, title: "Reliable manufacturers", text: "Sourced from trusted international suppliers" },
  { icon: ShieldCheck, title: "Safety & quality first", text: "High standards for every product we stock" },
  { icon: Tags, title: "Reasonable prices", text: "Fair pricing, clear before you order" },
  { icon: RefreshCw, title: "Support after purchase", text: "Warranty terms confirmed per item" },
];

const audiences = [
  {
    icon: Stethoscope,
    name: "Professionals & therapists",
    text: "Physiotherapists, massage therapists, hijama and acupuncture practitioners, and clinics.",
    points: [
      "Professional-grade equipment and consumables",
      "Combined quotes when equipping a practice",
      "Restocking of needles, cups and disposables",
    ],
    cta: "Request a quote",
  },
  {
    icon: GraduationCap,
    name: "Students & trainees",
    text: "Physiotherapy and therapy students who need reliable tools for training.",
    points: [
      "The right equipment for your coursework",
      "Reasonable prices for students",
      "Group orders for a class or cohort",
    ],
    cta: "Ask about student orders",
  },
  {
    icon: HeartHandshake,
    name: "Individuals & families",
    text: "People recovering at home, and those caring for a family member.",
    points: ["Home-use TENS and recovery devices", "Mobility and daily-living aids", "Advice on choosing the right product"],
    cta: "Get advice",
  },
];

const steps = [
  { title: "Browse or ask", text: "Shop online, or message us on WhatsApp with what you need." },
  { title: "Confirm your order", text: "We confirm price, availability and delivery before anything is charged." },
  { title: "Delivery", text: "Delivered to your clinic or home." },
  { title: "Support after purchase", text: "Questions on use, warranty or restocks go to the same team." },
];

export default function HomePage() {
  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 4);
  const tens = products.find((p) => p.slug === "4-in-1-tens-ems-unit");
  const table = products.find((p) => p.slug === "portable-treatment-table");

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-18">
          <div className="min-w-0">
            <p className="eyebrow inline-flex items-center gap-2 text-brand">
              <svg aria-hidden="true" width="22" height="12" viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0 12h12l4-9 6 18 5-12 3 3h14" />
              </svg>
              Physiotherapy · Rehabilitation · Therapy
            </p>
            <h1 className="display mt-4 mb-5 text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.04]">
              Quality equipment. Safer care. Better lives.
            </h1>
            <p className="mb-8 max-w-xl text-lg text-body">
              Medical, beauty, rehabilitation, physiotherapy and therapy equipment for practitioners, students and
              families across Lebanon, from a team that has worked in the field for {site.yearsInField} years.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/shop">
                  Shop equipment <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#advice">Ask us for advice</Link>
              </Button>
            </div>
            <dl className="mt-11 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-7">
              {[
                [`${site.yearsInField} years`, "in healthcare & rehab"],
                [String(categories.length), "specialist departments"],
                [site.customersServed, "customers served"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse gap-0.5">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-serif text-[clamp(1.5rem,3vw,1.9rem)] leading-tight">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-4">
            {tens ? (
              <Link
                href={`/product/${tens.slug}`}
                className="row-span-2 flex min-h-96 flex-col justify-between gap-4 rounded-2xl bg-muted p-6 hover:ring-2 hover:ring-[#cdbf9f]"
              >
                <span className="w-fit rounded-full bg-card px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]">
                  Electrotherapy
                </span>
                <div className="relative min-h-60 flex-1">
                  <Image src={tens.image!} alt={tens.name} fill priority sizes="(max-width: 1024px) 50vw, 280px" className="object-contain mix-blend-multiply" />
                </div>
                <span>
                  <span className="block font-semibold">4-in-1 TENS / EMS Unit</span>
                  <span className="text-sm text-muted-foreground">TENS · EMS · IF · RUSS, 2 channels</span>
                </span>
              </Link>
            ) : null}
            {table ? (
              <Link
                href={`/product/${table.slug}`}
                className="flex flex-col justify-between gap-2.5 rounded-2xl bg-muted p-5 hover:ring-2 hover:ring-[#cdbf9f]"
              >
                <div className="relative h-32">
                  <Image src={table.image!} alt={table.name} fill sizes="(max-width: 1024px) 50vw, 240px" className="object-contain mix-blend-multiply" />
                </div>
                <span>
                  <span className="block text-[15px] font-semibold">{table.name}</span>
                  <span className="text-[13px] text-muted-foreground">Wood frame, height adjustable</span>
                </span>
              </Link>
            ) : null}
            <Link href="#advice" className="flex flex-col justify-between gap-4 rounded-2xl bg-ink p-5 text-white hover:bg-ink-raised">
              <HomeIcon aria-hidden="true" className="size-7 text-gold" strokeWidth={1.6} />
              <span>
                <span className="block font-serif text-[22px] leading-tight">Equipping a practice?</span>
                <span className="mt-1.5 block text-sm text-ink-text">Send us your list for one combined quote.</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Standards */}
      <section aria-label="Our standards" className="border-b border-border">
        <div className="container-page grid gap-x-8 gap-y-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {standards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3.5">
              <Icon aria-hidden="true" className="size-6.5 shrink-0 text-brand" strokeWidth={1.7} />
              <div>
                <div className="text-[15px] font-semibold">{title}</div>
                <div className="text-sm text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="container-page pt-22 pb-10">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display mb-2.5 text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.1]">Shop by department</h2>
            <p className="text-[17px] text-muted-foreground">Everything for treatment, recovery and everyday independence.</p>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            All products <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-colors hover:border-[#cdbf9f]"
            >
              <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
                <CategoryIcon slug={c.slug} className="size-6 text-brand" strokeWidth={1.6} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[17px] font-semibold leading-snug">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c.items}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Who we serve */}
      <section id="who" className="mt-14 scroll-mt-4 bg-ink text-[#f3efe6]">
        <div className="container-page py-22">
          <div className="mb-11 flex flex-wrap items-end gap-x-16 gap-y-6">
            <div className="min-w-0 flex-[1_1_460px]">
              <p className="eyebrow mb-3.5 text-gold">Who we serve</p>
              <h2 className="display text-[clamp(2rem,3.8vw,3rem)] leading-[1.08] text-white">
                The right tools, whoever is holding them.
              </h2>
            </div>
            <p className="min-w-0 flex-[1_1_340px] text-[17px] text-ink-text">
              Our mission has always been human-centred: safe, reliable equipment at reasonable prices for the people
              who give care and the people who receive it.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {audiences.map(({ icon: Icon, ...a }) => (
              <article key={a.name} className="flex flex-col gap-4.5 rounded-2xl border border-ink-line bg-ink-raised p-7">
                <span className="flex size-13 items-center justify-center rounded-xl bg-[#2a2d33]">
                  <Icon aria-hidden="true" className="size-6.5 text-gold" strokeWidth={1.6} />
                </span>
                <h3 className="font-serif text-[26px] font-medium text-white">{a.name}</h3>
                <p className="text-[15px] text-ink-text">{a.text}</p>
                <ul className="flex flex-1 flex-col gap-2.5 border-t border-ink-line pt-4.5">
                  {a.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[15px]">
                      <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-gold" strokeWidth={2.2} />
                      {p}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="accent" className="w-fit">
                  <Link href="#advice">{a.cta}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Best sellers */}
      <section className="container-page pt-22 pb-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.1]">Best sellers</h2>
          <nav aria-label="Browse departments" className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className="flex h-10 items-center rounded-full border border-input bg-card px-4 text-sm hover:border-foreground"
              >
                {c.short}
              </Link>
            ))}
          </nav>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* About (short) */}
      <section className="container-page py-18">
        <div className="grid gap-x-18 gap-y-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3.5 text-brand">About {site.name}</p>
            <h2 className="display mb-5 text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.1]">
              We are not simply selling medical equipment.
            </h2>
            <p className="mb-4 text-[17px] text-body">
              {site.name} is a Lebanon-based medical equipment and healthcare supplies business with{" "}
              {site.yearsInField} years of experience in healthcare and rehabilitation.
            </p>
            <p className="mb-7 text-[17px] text-body">
              In that time we have supported healthcare professionals, therapists, students and individuals looking for
              reliable medical and rehabilitation solutions, and we keep expanding our range with reliable international
              manufacturers.
            </p>
            <Button asChild variant="outline">
              <Link href="/about">
                Our story <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-7">
              <h3 className="mb-2 font-serif text-2xl font-medium">Our mission</h3>
              <p className="text-body">
                Everyone deserves access to safe, reliable, high-quality medical equipment at reasonable prices. We
                support professionals in their daily work, help students get the right tools for their training, and
                improve comfort and independence for people who need rehabilitation products.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7">
              <h3 className="mb-2 font-serif text-2xl font-medium">Our vision</h3>
              <p className="text-body">
                To be Lebanon&apos;s trusted provider of medical equipment and rehabilitation supplies, through long-term
                relationships with reliable manufacturers and high standards of quality, safety, affordability and
                customer satisfaction.
              </p>
            </div>
            <div className="rounded-2xl bg-ink p-7 text-[#f3efe6]">
              <h3 className="mb-2 font-serif text-2xl font-medium text-white">Our commitment</h3>
              <p className="text-ink-text">
                To make healthcare, rehabilitation and professional practice safer, more accessible and more effective
                for everyone, built on trust, transparency and product quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How ordering works */}
      <section className="container-page pb-22">
        <div className="rounded-2xl border border-border bg-card p-[clamp(1.75rem,4vw,3.5rem)]">
          <h2 className="display mb-2 text-[clamp(1.9rem,3.2vw,2.5rem)] leading-[1.1]">How ordering works</h2>
          <p className="mb-10 text-[17px] text-muted-foreground">Simple, transparent, and a real person on the other end.</p>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2.5">
                <span className="font-serif text-[40px] leading-none text-brand">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[17px] font-semibold">{s.title}</span>
                <span className="text-[15px] text-muted-foreground">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Advice & quotes */}
      <section id="advice" className="scroll-mt-4 border-y border-border bg-muted">
        <div className="container-page grid gap-x-18 gap-y-12 py-22 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <p className="eyebrow mb-3.5 text-brand">Advice &amp; quotes</p>
            <h2 className="display mb-4.5 text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.1]">
              Not sure what you need? Ask us.
            </h2>
            <p className="mb-7 text-[17px] text-body">
              Tell us who the equipment is for and we will recommend the right product, or prepare a combined quote for a
              practice or a student group.
            </p>
            <a href={telHref} className="inline-flex items-center gap-3 text-[15px]">
              <span className="flex size-11 items-center justify-center rounded-full bg-ink">
                <Phone aria-hidden="true" className="size-4.5 text-white" />
              </span>
              <span>
                <span className="block text-[13px] text-muted-foreground">Call or WhatsApp</span>
                <span className="text-lg font-bold">{site.phoneDisplay}</span>
              </span>
            </a>
          </div>
          <EnquiryForm />
        </div>
      </section>
    </>
  );
}
