import Image from "next/image";
import Link from "next/link";

import { categories } from "@/lib/products";
import { site, telHref } from "@/lib/site";

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="bg-ink text-sm text-ink-text">
      <div className="container-page grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="" width={48} height={48} className="size-12 rounded-full" />
            <span className="font-serif text-[22px] text-white">{site.name}</span>
          </div>
          <p className="max-w-72">{site.slogan}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="mb-1 font-semibold text-white">Shop</h2>
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className="hover:text-gold">
              {c.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="mb-1 font-semibold text-white">Company</h2>
          <Link href="/about" className="hover:text-gold">
            About us
          </Link>
          <Link href="/contact#faq" className="hover:text-gold">
            Warranty &amp; returns
          </Link>
          <Link href="/contact#faq" className="hover:text-gold">
            Delivery
          </Link>
          <Link href="/contact" className="hover:text-gold">
            Contact
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="mb-1 font-semibold text-white">Visit or call</h2>
          {site.address ? <span>{site.address}</span> : null}
          {site.hours.map((h) => (
            <span key={h.days}>
              {h.days}: {h.time}
            </span>
          ))}
          <a href={telHref} className="font-semibold text-white hover:text-gold">
            {site.phoneDisplay}
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
        <span>
          © {year} {site.name}, Lebanon. All rights reserved.
        </span>
        <span className="max-w-160">
          Therapy and medical devices should be used as directed by a qualified healthcare professional.
          Specifications are provided by manufacturers.
        </span>
      </div>
    </footer>
  );
}
