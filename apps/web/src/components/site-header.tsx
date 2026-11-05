"use client";

import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import * as React from "react";
import { Languages, Menu, Phone, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { site, telHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/shop", key: "shop", match: (p: string) => p.startsWith("/shop") || p.startsWith("/product") },
  { href: "/#who", key: "professionals", match: () => false },
  { href: "/#who", key: "students", match: () => false },
  { href: "/about", key: "about", match: (p: string) => p === "/about" },
  { href: "/contact", key: "contact", match: (p: string) => p === "/contact" },
] as const;

/** Links to the same page in the other language. Search terms are dropped. */
function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      aria-label={t("switchLanguageLabel")}
      className={cn("inline-flex items-center gap-1.5 font-semibold hover:text-gold", className)}
    >
      <Languages aria-hidden="true" className="size-3.5" />
      {t("switchLanguage")}
    </Link>
  );
}

function SearchForm({ className, onDone }: { className?: string; onDone?: () => void }) {
  const router = useRouter();
  const t = useTranslations("Header");
  const id = React.useId();
  return (
    <form
      role="search"
      className={cn(
        "flex h-11 min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
        onDone?.();
      }}
    >
      <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <label htmlFor={id} className="sr-only">
        {t("searchLabel")}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder={t("searchPlaceholder")}
        className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}

function CartLink() {
  const { count } = useCart();
  const t = useTranslations("Header");
  return (
    <Button asChild>
      <Link href="/cart" aria-label={t("cartLabel", { count })}>
        <ShoppingCart />
        <span className="hidden sm:inline">{t("cart")}</span>
        <span className="tabular-nums">{count}</span>
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const t = useTranslations("Header");
  const tSite = useTranslations("Site");
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header>
      <div className="bg-ink text-[13px] text-[#e9e4d8]">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-7 gap-y-1 py-2">
          <div className="hidden flex-wrap gap-x-6 gap-y-1 sm:flex">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4 text-gold" />
              {t("yearsInField", { years: site.yearsInField })}
            </span>
            <span className="inline-flex items-center gap-2">
              <Truck aria-hidden="true" className="size-4 text-gold" />
              {tSite("delivery")}
            </span>
          </div>
          <div className="flex items-center gap-x-5">
            <a href={telHref} className="inline-flex items-center gap-2 hover:text-gold">
              <Phone aria-hidden="true" className="size-3.5" />
              <span>
                {t("callWhatsApp")} <bdi dir="ltr">{site.phoneDisplay}</bdi>
              </span>
            </a>
            <LanguageSwitch />
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card">
        <div className="container-page flex items-center gap-4 py-3.5 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image src="/images/logo.png" alt="" width={52} height={52} className="size-11 rounded-full sm:size-13" priority />
            <span className="flex flex-col leading-tight">
              <span className="font-serif text-xl font-semibold sm:text-[23px]">{site.name}</span>
              <span className="hidden text-[11px] uppercase tracking-[0.12em] text-muted-foreground sm:block">
                {tSite("tagline")}
              </span>
            </span>
          </Link>

          <nav aria-label={t("nav.main")} className="hidden items-center gap-6 text-[15px] font-medium lg:flex">
            {nav.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-b-2 py-1.5 transition-colors hover:text-brand",
                    active ? "border-brand text-brand" : "border-transparent",
                  )}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex min-w-0 flex-1 items-center justify-end gap-2.5">
            <SearchForm className="hidden w-full max-w-80 md:flex" />
            <CartLink />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="end" closeLabel={t("close")} className="px-6 pt-16">
                <SheetTitle>{site.name}</SheetTitle>
                <SheetDescription className="sr-only">{t("mainMenu")}</SheetDescription>
                <SearchForm onDone={() => setMenuOpen(false)} />
                <nav aria-label={t("nav.mobile")} className="flex flex-col">
                  {nav.map((item) => (
                    <SheetClose asChild key={item.key}>
                      <Link
                        href={item.href}
                        className="border-b border-border py-3.5 text-lg font-medium hover:text-brand"
                      >
                        {t(`nav.${item.key}`)}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <a href={telHref} className="mt-2 inline-flex items-center gap-2 font-semibold">
                  <Phone aria-hidden="true" className="size-4" />
                  <bdi dir="ltr">{site.phoneDisplay}</bdi>
                </a>
                <LanguageSwitch className="mt-2 text-base hover:text-brand" />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
