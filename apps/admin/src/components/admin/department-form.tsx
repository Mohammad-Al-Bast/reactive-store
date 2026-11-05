"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { categoryUpsertSchema, type AdminCategory, type CategoryTranslationInput } from "@reactive-store/shared";

import { slugify } from "@/components/admin/product-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminRequest } from "@/lib/admin/client";
import { cn } from "@/lib/utils";

type Locale = "en" | "ar";
type Text = { name: string; short: string; description: string; items: string };
type Draft = { slug: string; sortOrder: string; en: Text; ar: Text };
type Errors = Record<string, string>;

const emptyText = (): Text => ({ name: "", short: "", description: "", items: "" });
const hasText = (t: Text) => Object.values(t).some((v) => v.trim() !== "");

const fieldLabels: Record<keyof Text, { label: string; hint: string }> = {
  name: { label: "Name", hint: "Department page title and menus" },
  short: { label: "Short name", hint: "Chips in the shop menu" },
  description: { label: "Description", hint: "Top of the department page" },
  items: { label: "What it includes", hint: "Home page cards" },
};

/**
 * Creates or edits one department: English and Arabic side by side, then the
 * web address and position. After a save the page and side menu refresh.
 */
export function DepartmentForm({ initial, nextOrder = 1 }: { initial: AdminCategory | null; nextOrder?: number }) {
  const router = useRouter();
  const isNew = !initial;
  const start: Draft = {
    slug: initial?.slug ?? "",
    sortOrder: String(initial?.sortOrder ?? nextOrder),
    en: { ...emptyText(), ...initial?.translations.en },
    ar: { ...emptyText(), ...initial?.translations.ar },
  };
  const [draft, setDraft] = React.useState(start);
  const [saved, setSaved] = React.useState(start);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(!isNew);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const productCount = initial?.productCount ?? 0;

  const setText = (locale: Locale, key: keyof Text, value: string) => {
    setErrors((e) => ({ ...e, [`translations.${locale}.${key}`]: "" }));
    setDraft((d) => {
      const next = { ...d, [locale]: { ...d[locale], [key]: value } };
      if (locale === "en" && key === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  async function save() {
    const body = {
      slug: draft.slug,
      sortOrder: Number(draft.sortOrder) || 0,
      translations: {
        en: draft.en as CategoryTranslationInput,
        // Arabic is optional: left blank, the store shows the English text.
        ...(hasText(draft.ar) ? { ar: draft.ar as CategoryTranslationInput } : {}),
      },
    };
    const check = categoryUpsertSchema.safeParse(body);
    if (!check.success) {
      const next: Errors = {};
      for (const i of check.error.issues) next[i.path.join(".")] ??= i.message;
      setErrors(next);
      setFormError("Check the highlighted fields.");
      return;
    }
    setBusy(true);
    setErrors({});
    setFormError(null);
    const res = isNew
      ? await adminRequest<AdminCategory[]>("POST", "/admin/categories", body)
      : await adminRequest<AdminCategory[]>("PUT", `/admin/categories/${initial.id}`, body);
    setBusy(false);
    if (!res.ok) {
      setFormError(res.body.message ?? "Couldn't save. Try again.");
      return;
    }
    if (isNew) {
      const created = res.data.find((c) => c.slug === check.data.slug);
      router.push(created ? `/departments/${created.id}` : "/departments");
    } else {
      setSaved(draft);
    }
    // Updates the side menu and the department lists.
    router.refresh();
  }

  async function remove() {
    if (!initial || !window.confirm(`Delete the department “${saved.en.name}”?`)) return;
    setBusy(true);
    const res = await adminRequest("DELETE", `/admin/categories/${initial.id}`);
    if (!res.ok) {
      setBusy(false);
      setFormError(res.body.message ?? "Couldn't delete.");
      return;
    }
    router.push("/departments");
    router.refresh();
  }

  const column = (locale: Locale) => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    const t = draft[locale];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{locale === "en" ? "English" : "Arabic"}</h3>
          {locale === "ar" ? (
            hasText(t) ? (
              <Badge variant="outline">Translated</Badge>
            ) : (
              <Badge className="bg-gold text-gold-foreground">Missing: store shows English</Badge>
            )
          ) : (
            <Badge variant="outline">Required</Badge>
          )}
        </div>
        {(Object.keys(fieldLabels) as (keyof Text)[]).map((key) => {
          const id = `${initial?.id ?? "new"}-${locale}-${key}`;
          const error = errors[`translations.${locale}.${key}`];
          const Field = key === "description" ? Textarea : Input;
          return (
            <div key={key} className="grid gap-1.5">
              <Label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2">
                {fieldLabels[key].label}
                <span className="text-xs font-normal text-muted-foreground">{fieldLabels[key].hint}</span>
              </Label>
              <Field
                id={id}
                dir={dir}
                lang={locale}
                rows={key === "description" ? 3 : undefined}
                value={t[key]}
                aria-invalid={!!error}
                onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setText(locale, key, e.target.value)}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isNew ? "New department" : "Details"}</CardTitle>
        <CardDescription>Changes go live in the store as soon as you save.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {column("en")}
          <div className="border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">{column("ar")}</div>
        </div>
        <div className="flex flex-wrap items-start gap-4 border-t pt-5">
          <div className="grid gap-1.5">
            <Label htmlFor="dept-slug">Web address</Label>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
              /shop/
              <Input
                id="dept-slug"
                className="w-64"
                value={draft.slug}
                aria-invalid={!!errors.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setErrors((er) => ({ ...er, slug: "" }));
                  setDraft((d) => ({ ...d, slug: slugify(e.target.value) }));
                }}
              />
            </div>
            {errors.slug ? <p className="text-sm text-destructive">{errors.slug}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dept-order">Position in menus</Label>
            <Input
              id="dept-order"
              className="w-24"
              inputMode="numeric"
              value={draft.sortOrder}
              onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value.replace(/\D/g, "") }))}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3 border-t">
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {isNew ? (
            <Button type="button" variant="ghost" onClick={() => router.push("/departments")}>
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className={cn("text-destructive", productCount > 0 && "opacity-50")}
              disabled={busy || productCount > 0}
              title={productCount > 0 ? "Move or delete its products first" : undefined}
              onClick={() => void remove()}
            >
              <Trash2 /> Delete
            </Button>
          )}
          <Button type="button" disabled={busy || (!isNew && !dirty)} onClick={() => void save()}>
            {busy ? "Saving…" : isNew ? "Create department" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
