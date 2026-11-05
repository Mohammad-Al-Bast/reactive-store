import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { categories } from "@/lib/products";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About us",
  description: `${site.name} has spent ${site.yearsInField} years supporting healthcare professionals, therapists, students and families across Lebanon.`,
};

const values = [
  { title: "Trust", text: "Equipment and advice you can rely on, order after order." },
  { title: "Transparency", text: "Clear prices and honest recommendations, before you buy." },
  { title: "Product quality", text: "High standards of quality and safety for every product." },
  { title: "Mutual growth", text: "Long-term relationships with customers and manufacturers." },
];

/** Add manufacturer names here to show the "Manufacturers we work with" strip. */
const manufacturers: string[] = [];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="container-page grid items-center gap-x-18 gap-y-10 py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow mb-4 text-brand">About {site.name}</p>
            <h1 className="display mb-6 text-[clamp(2.5rem,5vw,3.9rem)] leading-[1.04]">
              {site.yearsInField} years supporting care across Lebanon.
            </h1>
            <p className="mb-4 text-lg text-body">
              {site.name} is a Lebanon-based medical equipment and healthcare supplies business with {site.yearsInField}{" "}
              years of experience in the healthcare and rehabilitation field.
            </p>
            <p className="text-lg text-body">
              Over those years, we have dedicated our time, energy and passion to supporting healthcare professionals,
              therapists, students and individuals looking for reliable medical and rehabilitation solutions.
            </p>
          </div>
          {/* Replace with a real photo of your team or store: the most trusted image on the page. */}
          <div className="flex h-[440px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#cdbf9f] bg-muted p-6 text-center text-sm text-muted-foreground">
            Photo: your team, store or warehouse — a real photo, not stock
          </div>
        </div>
      </section>

      <section className="container-page grid gap-5 py-22 md:grid-cols-2">
        <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-9">
          <p className="eyebrow text-brand">Our mission</p>
          <h2 className="display text-3xl leading-tight">Human-centred, not simply commercial.</h2>
          <p className="text-body">
            We believe everyone deserves access to safe, reliable, high-quality medical equipment at reasonable prices.
          </p>
          <p className="text-body">
            We support healthcare professionals in their daily work, help students and trainees access the right tools
            for their education, and improve the comfort, independence and quality of life of people who need healthcare
            and rehabilitation products.
          </p>
        </div>
        <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-9">
          <p className="eyebrow text-brand">Our vision</p>
          <h2 className="display text-3xl leading-tight">A trusted provider for Lebanon.</h2>
          <p className="text-body">
            We aim to establish {site.name} as a trusted medical equipment and rehabilitation supplies provider in
            Lebanon, by building long-term relationships with reliable manufacturers and maintaining high standards of
            quality, safety, affordability and customer satisfaction.
          </p>
        </div>
      </section>

      <section className="bg-ink text-[#f3efe6]">
        <div className="container-page py-22">
          <h2 className="display mb-3 text-[clamp(2rem,3.8vw,2.9rem)] leading-[1.1] text-white">
            What we build our relationships on
          </h2>
          <p className="mb-11 max-w-2xl text-[17px] text-ink-text">
            Successful relationships, with customers and with manufacturers, are built on four things.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="flex flex-col gap-2 border-t-2 border-gold pt-5">
                <span className="font-serif text-[26px] text-white">{v.title}</span>
                <span className="text-[15px] text-ink-text">{v.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-x-18 gap-y-8 py-22 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="display mb-4 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.1]">What we supply</h2>
          <p className="mb-6 text-[17px] text-body">
            A wide range of medical, physiotherapy, rehabilitation, wellness and therapeutic equipment, and we keep
            expanding it with reliable international manufacturers and suppliers.
          </p>
          <Button asChild size="lg">
            <Link href="/shop">Browse all products</Link>
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
            <p className="eyebrow text-brand">Manufacturers we work with</p>
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
          <p className="eyebrow text-brand">Our commitment</p>
          <p className="font-serif text-[clamp(1.75rem,3.4vw,2.6rem)] font-medium leading-tight">
            We are not simply selling medical equipment. We are working to make healthcare, rehabilitation and
            professional practice safer, more accessible and more effective for everyone.
          </p>
          <span className="text-[15px] font-semibold tracking-[0.08em] text-muted-foreground">{site.slogan}</span>
          <Button asChild size="lg" className="mt-3">
            <Link href="/contact">Talk to our team</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
