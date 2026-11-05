"use client";

import { Link } from "@/i18n/navigation";
import * as React from "react";
import { Check, MessageCircle, Minus, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  createOrderSchema,
  HONEYPOT_FIELD,
  type CreateOrderInput,
  type OrderSummary,
  type PaymentMethod,
} from "@reactive-store/shared";
import { useLocale, useTranslations } from "next-intl";

import { useErrorText } from "@/i18n/errors";
import { fieldErrors, postJson } from "@/lib/api-client";
import { formatPrice, ltr, site, telHref, whatsappHref } from "@/lib/site";
import { buildOrderMessage } from "@/lib/whatsapp";

type Field = "name" | "phone" | "city" | "address" | "notes";
type Errors = Partial<Record<Field, string>>;
const fields: Field[] = ["name", "phone", "city", "address", "notes"];

export function Checkout() {
  const cart = useCart();
  const locale = useLocale();
  const t = useTranslations("Checkout");
  const tc = useTranslations("Common");
  const tSite = useTranslations("Site");
  const errorText = useErrorText();
  const price = (p: number | null | undefined) => formatPrice(p, tc("priceOnRequest"));
  const phone = ltr(site.phoneDisplay);
  const [payment, setPayment] = React.useState<PaymentMethod>(site.paymentMethods[0]);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [placed, setPlaced] = React.useState<OrderSummary | null>(null);

  function showErrors(next: Errors) {
    setErrors(next);
    const first = fields.find((k) => next[k]);
    if (first) document.getElementById(`co-${first}`)?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const order: CreateOrderInput = {
      locale,
      items: cart.lines.map((l) => ({ slug: l.slug, qty: l.qty })),
      customer: {
        name: get("name"),
        phone: get("phone"),
        governorate: get("governorate") as CreateOrderInput["customer"]["governorate"],
        city: get("city"),
        address: get("address"),
        notes: get("notes") || undefined,
      },
      paymentMethod: payment,
      [HONEYPOT_FIELD]: get(HONEYPOT_FIELD) || undefined,
    };

    // Same schema the API uses, so most mistakes are caught before the request.
    const check = createOrderSchema.safeParse(order);
    if (!check.success) {
      showErrors(
        fieldErrors(
          check.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          errorText,
        ),
      );
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    const res = await postJson<OrderSummary>("/orders", order);
    setSubmitting(false);

    if (res.ok) {
      setPlaced(res.data);
      cart.clear();
      window.scrollTo({ top: 0 });
      return;
    }
    if (res.status === 400) {
      showErrors(fieldErrors(res.body.issues, errorText));
    } else if (res.status === 422) {
      setFormError(t("unavailable"));
      cart.refresh();
    } else if (res.status === 429) {
      setFormError(t("tooMany", { phone }));
    } else {
      setFormError(t("failed", { phone }));
    }
  }

  const clear = (k: Field) => () => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  if (placed) {
    return (
      <div className="container-page flex max-w-2xl flex-col items-center gap-4.5 py-24 text-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-[#e6f0e9]">
          <Check aria-hidden="true" className="size-9 text-success" strokeWidth={2.2} />
        </span>
        <h1 className="display text-[44px] leading-[1.1]">{t("thanksTitle")}</h1>
        <p className="text-[17px] text-body" role="status">
          {t.rich("thanksText", {
            number: placed.number,
            replyTime: tSite("replyTime"),
            strong: (chunks) => (
              <strong>
                <bdi dir="ltr">{chunks}</bdi>
              </strong>
            ),
          })}
        </p>
        <p className="text-[15px] text-muted-foreground">{t("thanksWhatsApp")}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href={whatsappHref(buildOrderMessage(placed))} target="_blank" rel="noreferrer">
              <MessageCircle /> {tc("sendOnWhatsApp")}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="container-page flex max-w-2xl flex-col items-start gap-4 py-24">
        <h1 className="display text-[44px]">{t("emptyTitle")}</h1>
        <p className="text-[17px] text-body">{t("emptyText")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/shop">{t("continueShopping")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">{t("askUs")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 pb-22">
      <h1 className="display mb-2 text-[clamp(2.1rem,4vw,3rem)]">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("intro")}</p>

      <form noValidate onSubmit={onSubmit} className="relative flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Honeypot: hidden from people, so only bots fill it in. */}
        <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
          <label htmlFor="co-website">{tc("leaveEmpty")}</label>
          <input id="co-website" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="h-items" className="rounded-2xl border border-border bg-card p-6">
            <h2 id="h-items" className="mb-2 text-lg font-bold">
              {t("items")}
            </h2>
            {cart.error ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 py-6">
                <p className="text-destructive">{t("loadError")}</p>
                <Button type="button" variant="secondary" onClick={cart.retry}>
                  {t("tryAgain")}
                </Button>
              </div>
            ) : !cart.ready ? (
              <div role="status" aria-live="polite">
                <span className="sr-only">{t("loading")}</span>
                {/* Placeholder rows shaped like cart lines, until product details arrive. */}
                {[0, 1].map((i) => (
                  <div key={i} className="flex flex-wrap items-center gap-4 border-b border-[#efebe2] py-4.5 last:border-0">
                    <Skeleton className="size-22 shrink-0 rounded-lg" />
                    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                    <Skeleton className="h-11 w-29" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="size-11" />
                  </div>
                ))}
              </div>
            ) : null}
            <ul>
              {cart.lines.map(({ product, qty }) => (
                <li key={product.slug} className="flex flex-wrap items-center gap-4 border-b border-[#efebe2] py-4.5 last:border-0">
                  <ProductImage product={product} className="size-22 shrink-0 rounded-lg" sizes="88px" />
                  <div className="min-w-0 flex-[1_1_200px]">
                    <Link href={`/product/${product.slug}`} className="font-semibold hover:text-brand">
                      {product.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">{price(product.price)}</div>
                  </div>
                  <div role="group" aria-label={t("qtyFor", { name: product.name })} className="flex h-11 items-center rounded-md border border-input">
                    <button
                      type="button"
                      aria-label={t("decrease")}
                      onClick={() => cart.setQty(product.slug, qty - 1)}
                      className="flex size-11 items-center justify-center hover:bg-muted"
                    >
                      <Minus className="size-4" />
                    </button>
                    <output className="w-7 text-center font-semibold">{qty}</output>
                    <button
                      type="button"
                      aria-label={t("increase")}
                      onClick={() => cart.setQty(product.slug, qty + 1)}
                      className="flex size-11 items-center justify-center hover:bg-muted"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="w-28 text-end font-bold">
                    {product.price == null ? <span className="text-sm text-muted-foreground">{t("onRequest")}</span> : price(product.price * qty)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("remove", { name: product.name })}
                    onClick={() => cart.remove(product.slug)}
                    className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-delivery" className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
            <h2 id="h-delivery" className="text-lg font-bold sm:col-span-2">
              {t("delivery")}
            </h2>
            <div className="grid gap-2">
              <Label htmlFor="co-name">{tc("fullName")}</Label>
              <Input id="co-name" name="name" autoComplete="name" aria-invalid={!!errors.name} onChange={clear("name")} />
              {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-phone">{tc("phone")}</Label>
              <Input id="co-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" placeholder="+961" className="text-start rtl:text-end" aria-invalid={!!errors.phone} onChange={clear("phone")} />
              {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-governorate">{t("governorate")}</Label>
              <NativeSelect id="co-governorate" name="governorate">
                {site.governorates.map((g) => (
                  <option key={g} value={g}>
                    {tSite(`governorates.${g}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-city">{t("city")}</Label>
              <Input id="co-city" name="city" autoComplete="address-level2" aria-invalid={!!errors.city} onChange={clear("city")} />
              {errors.city ? <p className="text-sm text-destructive">{errors.city}</p> : null}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="co-address">{t("address")}</Label>
              <Textarea
                id="co-address"
                name="address"
                rows={3}
                autoComplete="street-address"
                placeholder={t("addressPlaceholder")}
                aria-invalid={!!errors.address}
                onChange={clear("address")}
              />
              {errors.address ? <p className="text-sm text-destructive">{errors.address}</p> : null}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="co-notes">
                {t("notes")} <span className="font-normal text-muted-foreground">{tc("optional")}</span>
              </Label>
              <Input
                id="co-notes"
                name="notes"
                placeholder={t("notesPlaceholder")}
                aria-invalid={!!errors.notes}
                onChange={clear("notes")}
              />
              {errors.notes ? <p className="text-sm text-destructive">{errors.notes}</p> : null}
            </div>
          </section>

          <section aria-labelledby="h-pay" className="rounded-2xl border border-border bg-card p-6">
            <h2 id="h-pay" className="mb-4 text-lg font-bold">
              {t("payment")}
            </h2>
            <RadioGroup aria-labelledby="h-pay" value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="sm:grid-cols-2">
              {site.paymentMethods.map((m) => (
                <RadioCard key={m} value={m}>
                  <span className="text-[15px] font-bold">{tSite(`payment.${m}.name`)}</span>
                  <span className="text-[13px] text-muted-foreground">{tSite(`payment.${m}.description`)}</span>
                </RadioCard>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside aria-label={t("summaryLabel")} className="flex w-full flex-col gap-3.5 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-6 lg:w-90">
          <h2 className="text-lg font-bold">{t("summary")}</h2>
          <div className="flex justify-between gap-4 text-[15px]">
            <span className="text-muted-foreground">{t("itemsCount", { count: cart.count })}</span>
            {cart.ready ? (
              <span>{cart.subtotal > 0 ? price(cart.subtotal) : t("toBeConfirmed")}</span>
            ) : (
              <Skeleton className="h-5 w-20" />
            )}
          </div>
          <div className="flex justify-between gap-4 text-[15px]">
            <span className="text-muted-foreground">{t("deliveryRow")}</span>
            <span>{tSite("deliveryFee")}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3.5 text-xl font-bold">
            <span>{t("total")}</span>
            {cart.ready ? (
              <span>{cart.subtotal > 0 && !cart.hasUnpriced ? price(cart.subtotal) : t("confirmByPhone")}</span>
            ) : (
              <Skeleton className="h-6 w-28" />
            )}
          </div>
          <p className="-mt-2 text-[13px] text-muted-foreground">{t("plusDelivery")}</p>
          {cart.hasUnpriced ? <p className="text-[13px] text-muted-foreground">{t("someOnRequest")}</p> : null}
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="mt-1.5"
            disabled={!cart.ready || cart.lines.length === 0 || submitting}
            aria-busy={submitting}
          >
            {submitting ? t("placing") : t("place")}
          </Button>
          <p className="text-center text-[13px] text-muted-foreground">{t("payNothing")}</p>
          <div className="flex flex-col gap-2.5 border-t border-[#efebe2] pt-3.5 text-sm">
            <span className="flex items-center gap-2.5">
              <ShieldCheck aria-hidden="true" className="size-4.5 text-brand" /> {t("warrantyNote")}
            </span>
            <a href={telHref} className="flex items-center gap-2.5 hover:text-brand">
              <Phone aria-hidden="true" className="size-4.5 text-brand" /> {t("questions", { phone })}
            </a>
          </div>
        </aside>
      </form>
    </div>
  );
}
