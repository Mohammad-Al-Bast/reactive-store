"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { AlertTriangle, ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import {
  audienceSchema,
  hasPlaceholder,
  PRODUCT_IMAGE_TYPES,
  productUpsertSchema,
  stockSchema,
  type AdminCategory,
  type AdminProduct,
  type AdminProductImage,
  type Audience,
  type ProductStatus,
  type ProductTranslation,
  type ProductUpsert,
  type Stock,
} from "@reactive-store/shared";

import { PairListEditor, RowButtons } from "@/components/admin/list-editors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { adminRequest } from "@/lib/admin/client";
import { audienceLabel, stockLabel } from "@/lib/products";
import { cn } from "@/lib/utils";

/* ---------- Form state ---------- */

type TextForm = {
  name: string;
  type: string;
  summary: string;
  badge: string;
  description: string;
  safety: string;
  /** One item per line. */
  inTheBox: string;
  modes: { name: string; text: string }[];
  specs: { label: string; value: string }[];
  faq: { q: string; a: string }[];
};

type Form = {
  slug: string;
  categoryId: string;
  /** Text so it can be blank (price on request). */
  price: string;
  stock: Stock;
  status: ProductStatus;
  bestSeller: boolean;
  audience: Audience[];
  sortOrder: string;
  en: TextForm;
  ar: TextForm | null;
  related: string[];
  images: AdminProductImage[];
};

const emptyText = (): TextForm => ({
  name: "",
  type: "",
  summary: "",
  badge: "",
  description: "",
  safety: "",
  inTheBox: "",
  modes: [],
  specs: [],
  faq: [],
});

const textForm = (t: ProductTranslation | undefined): TextForm =>
  t
    ? {
        name: t.name,
        type: t.type,
        summary: t.summary,
        badge: t.badge ?? "",
        description: t.description ?? "",
        safety: t.safety ?? "",
        inTheBox: t.inTheBox.join("\n"),
        modes: t.modes,
        specs: t.specs,
        faq: t.faq,
      }
    : emptyText();

function toForm(p: AdminProduct | null, categories: AdminCategory[]): Form {
  return {
    slug: p?.slug ?? "",
    categoryId: p?.categoryId ?? categories[0]?.id ?? "",
    price: p?.price == null ? "" : String(p.price),
    stock: p?.stock ?? "in-stock",
    status: p?.status ?? "draft",
    bestSeller: p?.bestSeller ?? false,
    audience: p?.audience ?? [],
    sortOrder: String(p?.sortOrder ?? 0),
    en: textForm(p?.translations.en),
    ar: p?.translations.ar ? textForm(p.translations.ar) : null,
    related: p?.related ?? [],
    images: p?.images ?? [],
  };
}

const filled = <T extends Record<string, string>>(rows: T[]) =>
  rows.filter((r) => Object.values(r).some((v) => v.trim()));

function textPayload(t: TextForm): ProductUpsert["translations"]["en"] {
  return {
    name: t.name,
    type: t.type,
    summary: t.summary,
    badge: t.badge,
    description: t.description,
    safety: t.safety,
    inTheBox: t.inTheBox.split("\n").map((l) => l.trim()).filter(Boolean),
    modes: filled(t.modes),
    specs: filled(t.specs),
    faq: filled(t.faq),
  };
}

function toPayload(f: Form): ProductUpsert {
  const price = f.price.trim();
  return {
    slug: f.slug.trim(),
    categoryId: f.categoryId,
    price: price === "" ? null : Number(price.replace(",", ".")),
    stock: f.stock,
    status: f.status,
    bestSeller: f.bestSeller,
    audience: f.audience,
    sortOrder: Number(f.sortOrder) || 0,
    translations: { en: textPayload(f.en), ...(f.ar ? { ar: textPayload(f.ar) } : {}) },
    related: f.related,
    images: f.images.map((i) => ({ id: i.id, alt: i.alt ?? "" })),
  };
}

/** "Massage Gun, Pro!" → "massage-gun-pro" */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const fieldNames: Record<string, string> = {
  slug: "Web address",
  categoryId: "Department",
  price: "Price",
  name: "Name",
  type: "Product type",
  summary: "Summary",
};

/** "translations.ar.specs.0.value" → "Arabic · specs 1 · value" */
function readablePath(path: string) {
  return path
    .replace(/^translations\.en\.?/, "English · ")
    .replace(/^translations\.ar\.?/, "Arabic · ")
    .replace(/\.(\d+)/g, (_, n) => ` ${Number(n) + 1}`)
    .replace(/\./g, " · ")
    .split(" · ")
    .map((part) => fieldNames[part] ?? part)
    .join(" · ");
}

/* ---------- Editor ---------- */

export function ProductEditor({
  product,
  categories,
  allProducts,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  allProducts: { slug: string; name: string; status: ProductStatus }[];
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState<AdminProduct | null>(product);
  const [initial, setInitial] = React.useState(() => toForm(product, categories));
  const [form, setForm] = React.useState(initial);
  const [tab, setTab] = React.useState<"en" | "ar">("en");
  const [slugTouched, setSlugTouched] = React.useState(!!product);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setNotice(null);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const setText = (locale: "en" | "ar", patch: Partial<TextForm>) => {
    setNotice(null);
    setForm((f) => {
      const current = f[locale] ?? emptyText();
      const next = { ...f, [locale]: { ...current, ...patch } };
      if (locale === "en" && patch.name !== undefined && !slugTouched) next.slug = slugify(patch.name);
      return next;
    });
  };

  const placeholderBlocksPublish = form.status === "published" && hasPlaceholder(toPayload(form).translations);

  function loadSaved(p: AdminProduct) {
    const next = toForm(p, categories);
    setSaved(p);
    setInitial(next);
    setForm(next);
  }

  async function save() {
    const payload = toPayload(form);
    const check = productUpsertSchema.safeParse(payload);
    if (!check.success) {
      setErrors(check.error.issues.slice(0, 8).map((i) => `${readablePath(i.path.join("."))}: ${i.message}`));
      return;
    }
    setBusy(true);
    setErrors([]);
    const res = saved
      ? await adminRequest<AdminProduct>("PUT", `/admin/products/${saved.id}`, payload)
      : await adminRequest<AdminProduct>("POST", "/admin/products", payload);
    setBusy(false);
    if (!res.ok) {
      setErrors(
        res.body.issues?.length
          ? res.body.issues.slice(0, 8).map((i) => `${readablePath(i.path)}: ${i.message}`)
          : [res.body.message ?? "Couldn't save. Try again."],
      );
      return;
    }
    loadSaved(res.data);
    setNotice(res.data.status === "published" ? "Saved. The store shows the changes now." : "Saved as a draft.");
    if (!saved) router.replace(`/admin/products/${res.data.id}`);
  }

  async function remove() {
    if (!saved || !window.confirm(`Delete “${form.en.name || saved.slug}”? Past orders keep their copy of it.`)) return;
    setBusy(true);
    const res = await adminRequest("DELETE", `/admin/products/${saved.id}`);
    setBusy(false);
    if (!res.ok) {
      setErrors([res.body.message ?? "Couldn't delete. Try again."]);
      return;
    }
    setInitial(form); // nothing left to lose
    router.push("/admin/products");
    router.refresh();
  }

  async function upload(file: File) {
    if (!saved) return;
    setUploading(true);
    setErrors([]);
    const data = new FormData();
    data.set("file", file);
    const res = await adminRequest<AdminProduct>("POST", `/admin/products/${saved.id}/images`, data);
    setUploading(false);
    if (!res.ok) {
      setErrors([res.body.message ?? "Couldn't upload the photo."]);
      return;
    }
    // Keep unsaved edits; take only the new photo list from the server.
    setSaved(res.data);
    setForm((f) => ({ ...f, images: res.data.images }));
    setInitial((i) => ({ ...i, images: res.data.images }));
  }

  async function deleteImage(img: AdminProductImage) {
    if (!saved || !window.confirm("Delete this photo?")) return;
    const res = await adminRequest<AdminProduct>("DELETE", `/admin/products/${saved.id}/images/${img.id}`);
    if (!res.ok) {
      setErrors([res.body.message ?? "Couldn't delete the photo."]);
      return;
    }
    setForm((f) => ({ ...f, images: res.data.images }));
    setInitial((i) => ({ ...i, images: res.data.images }));
  }

  const text = tab === "ar" ? form.ar : form.en;
  const dir = tab === "ar" ? "rtl" : "ltr";
  const others = allProducts.filter((p) => p.slug !== saved?.slug).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-6"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="display min-w-0 flex-1 text-[clamp(1.6rem,3vw,2.1rem)] leading-tight">
          {saved ? form.en.name || saved.slug : "New product"}
        </h1>
        {saved?.status === "published" ? (
          <a
            href={`/en/product/${saved.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            View in store <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        ) : null}
      </header>

      {saved?.warnings.length ? (
        <ul className="flex flex-col gap-1 rounded-xl border border-[#e8d3a6] bg-warning-soft p-4 text-sm">
          {saved.warnings.map((w) => (
            <li key={w} className="flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warning" /> {w}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Text, per language */}
          <section aria-label="Product text" className="rounded-xl border border-border bg-card p-5">
            <div role="tablist" aria-label="Language" className="mb-5 flex gap-2">
              {(["en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={tab === l}
                  onClick={() => setTab(l)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm",
                    tab === l ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input hover:border-foreground",
                  )}
                >
                  {l === "en" ? "English" : `Arabic${form.ar ? "" : " (not added)"}`}
                </button>
              ))}
            </div>

            {tab === "ar" && !form.ar ? (
              <div className="flex flex-col items-start gap-3 text-sm">
                <p className="text-muted-foreground">
                  Arabic pages go live in a later phase. You can add the translation now; until then it is saved but not shown.
                </p>
                <Button type="button" variant="secondary" onClick={() => set("ar", textForm(undefined))}>
                  Add Arabic translation
                </Button>
              </div>
            ) : text ? (
              <div className="grid gap-4" dir={dir}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Name" required value={text.name} dir={dir} onChange={(v) => setText(tab, { name: v })} />
                  <TextField label="Product type" required value={text.type} dir={dir} placeholder="e.g. TENS & EMS" onChange={(v) => setText(tab, { type: v })} />
                </div>
                <TextField label="Summary (one line on product cards)" required value={text.summary} dir={dir} onChange={(v) => setText(tab, { summary: v })} />
                <TextField label="Badge (optional)" value={text.badge} dir={dir} placeholder="e.g. Best seller" onChange={(v) => setText(tab, { badge: v })} />
                <TextField label="Description" multiline value={text.description} dir={dir} onChange={(v) => setText(tab, { description: v })} />
                <PairListEditor
                  legend="What it does (modes)"
                  dir={dir}
                  fields={[
                    { key: "name", label: "Mode" },
                    { key: "text", label: "What it does" },
                  ]}
                  rows={text.modes}
                  onChange={(rows) => setText(tab, { modes: rows })}
                  addLabel="Add mode"
                />
                <TextField
                  label="In the box (one item per line)"
                  multiline
                  value={text.inTheBox}
                  dir={dir}
                  onChange={(v) => setText(tab, { inTheBox: v })}
                />
                <PairListEditor
                  legend="Specifications"
                  dir={dir}
                  fields={[
                    { key: "label", label: "Label", placeholder: "e.g. Weight" },
                    { key: "value", label: "Value", placeholder: "e.g. 2.3 kg" },
                  ]}
                  rows={text.specs}
                  onChange={(rows) => setText(tab, { specs: rows })}
                  addLabel="Add specification"
                />
                <TextField label="Safety information" multiline value={text.safety} dir={dir} onChange={(v) => setText(tab, { safety: v })} />
                <PairListEditor
                  legend="Questions and answers"
                  dir={dir}
                  fields={[
                    { key: "q", label: "Question" },
                    { key: "a", label: "Answer", multiline: true },
                  ]}
                  rows={text.faq}
                  onChange={(rows) => setText(tab, { faq: rows })}
                  addLabel="Add question"
                />
                {tab === "ar" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-fit text-destructive"
                    onClick={() => window.confirm("Remove the Arabic translation?") && set("ar", null)}
                  >
                    Remove Arabic translation
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Photos */}
          <section aria-labelledby="h-photos" className="rounded-xl border border-border bg-card p-5">
            <h2 id="h-photos" className="mb-1 font-bold">
              Photos
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              The first photo is the main one. JPEG, PNG, WebP or AVIF, up to 8 MB; resized and converted automatically.
            </p>
            {!saved ? (
              <p className="text-sm text-muted-foreground">Save the product first, then add photos.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {form.images.map((img, i) => (
                  <div key={img.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="size-16 shrink-0 rounded-md bg-muted object-contain mix-blend-multiply" />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <label htmlFor={`alt-${img.id}`} className="text-[13px] text-muted-foreground">
                        Description for screen readers and Google
                      </label>
                      <Input
                        id={`alt-${img.id}`}
                        value={img.alt ?? ""}
                        onChange={(e) => set("images", form.images.map((x) => (x.id === img.id ? { ...x, alt: e.target.value } : x)))}
                      />
                    </div>
                    <RowButtons
                      index={i}
                      count={form.images.length}
                      onMove={(index, by) => {
                        const next = [...form.images];
                        const [moved] = next.splice(index, 1);
                        next.splice(index + by, 0, moved!);
                        set("images", next);
                      }}
                      onRemove={() => void deleteImage(img)}
                    />
                  </div>
                ))}
                <label
                  className={cn(
                    "flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2.5 text-sm font-semibold hover:border-foreground",
                    uploading && "pointer-events-none opacity-60",
                  )}
                >
                  <ImagePlus aria-hidden="true" className="size-4" />
                  {uploading ? "Uploading…" : "Add photo"}
                  <input
                    type="file"
                    accept={PRODUCT_IMAGE_TYPES.join(",")}
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(file);
                    }}
                  />
                </label>
              </div>
            )}
          </section>

          {/* Related */}
          <section aria-labelledby="h-related" className="rounded-xl border border-border bg-card p-5">
            <h2 id="h-related" className="mb-1 font-bold">
              Often bought together
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">Shown on the product page in the order you tick them. Drafts stay hidden.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {others.map((p) => {
                const id = `rel-${p.slug}`;
                const position = form.related.indexOf(p.slug);
                return (
                  <div key={p.slug} className="flex items-center gap-2.5">
                    <Checkbox
                      id={id}
                      checked={position >= 0}
                      onCheckedChange={(on) =>
                        set("related", on ? [...form.related, p.slug] : form.related.filter((s) => s !== p.slug))
                      }
                    />
                    <Label htmlFor={id} className="text-sm font-normal">
                      {position >= 0 ? <span className="mr-1 font-semibold text-brand">{position + 1}.</span> : null}
                      {p.name}
                      {p.status === "draft" ? <span className="ml-1 text-muted-foreground">(draft)</span> : null}
                    </Label>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar: publishing and basics */}
        <aside className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Visibility</legend>
            {(["draft", "published"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="radio" name="status" checked={form.status === s} onChange={() => set("status", s)} className="size-4 accent-[var(--brand)]" />
                {s === "draft" ? "Draft (hidden from the store)" : "Published"}
              </label>
            ))}
            {placeholderBlocksPublish ? (
              <p className="text-[13px] text-destructive">Replace the [bracketed] text before publishing.</p>
            ) : null}
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor="category">Department</Label>
            <NativeSelect id="category" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.translations.en?.name ?? c.slug}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              inputMode="decimal"
              value={form.price}
              placeholder="Blank = price on request"
              onChange={(e) => set("price", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="stock">Stock</Label>
            <NativeSelect id="stock" value={form.stock} onChange={(e) => set("stock", e.target.value as Stock)}>
              {stockSchema.options.map((s) => (
                <option key={s} value={s}>
                  {stockLabel[s]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Best for</legend>
            {audienceSchema.options.map((a) => (
              <div key={a} className="flex items-center gap-2.5">
                <Checkbox
                  id={`aud-${a}`}
                  checked={form.audience.includes(a)}
                  onCheckedChange={(on) => set("audience", on ? [...form.audience, a] : form.audience.filter((x) => x !== a))}
                />
                <Label htmlFor={`aud-${a}`} className="text-sm font-normal">
                  {audienceLabel[a]}
                </Label>
              </div>
            ))}
          </fieldset>

          <div className="flex items-center gap-2.5">
            <Checkbox id="best" checked={form.bestSeller} onCheckedChange={(on) => set("bestSeller", on === true)} />
            <Label htmlFor="best" className="text-sm font-normal">
              Best seller (shown on the home page)
            </Label>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Advanced</summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="slug">Web address</Label>
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  /product/
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", slugify(e.target.value));
                    }}
                  />
                </div>
                {saved && form.slug !== saved.slug ? (
                  <p className="text-[13px] text-warning">Changing it breaks links people already shared.</p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="order">Position in its department</Label>
                <Input id="order" inputMode="numeric" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
          </details>

          {errors.length ? (
            <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          {notice && !dirty ? (
            <p role="status" className="text-sm text-success">
              {notice}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={busy || placeholderBlocksPublish || (!!saved && !dirty)}>
            {busy ? "Saving…" : saved ? (dirty ? "Save changes" : "Saved") : "Create product"}
          </Button>
          {saved ? (
            <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => void remove()}>
              <Trash2 /> Delete product
            </Button>
          ) : null}
        </aside>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline,
  required,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}) {
  const id = React.useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {multiline ? (
        <Textarea id={id} dir={dir} rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} dir={dir} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
