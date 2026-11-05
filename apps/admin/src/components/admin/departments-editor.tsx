"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { categoryUpsertSchema, type AdminCategory, type CategoryTranslationInput } from "@reactive-store/shared";

import { slugify } from "@/components/admin/product-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminRequest } from "@/lib/admin/client";

type Text = { name: string; short: string; description: string; items: string };
type Draft = { id: string | null; slug: string; sortOrder: string; en: Text; ar: Text | null; productCount: number };

const emptyText = (): Text => ({ name: "", short: "", description: "", items: "" });

const toDraft = (c: AdminCategory): Draft => ({
  id: c.id,
  slug: c.slug,
  sortOrder: String(c.sortOrder),
  en: c.translations.en ?? emptyText(),
  ar: c.translations.ar ?? null,
  productCount: c.productCount,
});

/** Every department as an editable card, plus one to add a new department. */
export function DepartmentsEditor({ initial }: { initial: AdminCategory[] }) {
  const [categories, setCategories] = React.useState(initial);
  const [adding, setAdding] = React.useState(false);
  const nextOrder = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Departments group products in the shop menu. Edits go live in the store as soon as you save.
      </p>
      {categories.map((c) => (
        <DepartmentCard
          key={c.id}
          initial={toDraft(c)}
          onSaved={setCategories}
          onDeleted={(id) => setCategories((all) => all.filter((x) => x.id !== id))}
        />
      ))}
      {adding ? (
        <DepartmentCard
          initial={{ id: null, slug: "", sortOrder: String(nextOrder), en: emptyText(), ar: null, productCount: 0 }}
          onSaved={(all) => {
            setCategories(all);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button type="button" variant="secondary" className="w-fit" onClick={() => setAdding(true)}>
          <Plus /> Add department
        </Button>
      )}
    </div>
  );
}

function DepartmentCard({
  initial,
  onSaved,
  onDeleted,
  onCancel,
}: {
  initial: Draft;
  onSaved: (all: AdminCategory[]) => void;
  onDeleted?: (id: string) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(!!initial.id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const isNew = !draft.id;

  const setText = (locale: "en" | "ar", patch: Partial<Text>) =>
    setDraft((d) => {
      const next = { ...d, [locale]: { ...(d[locale] ?? emptyText()), ...patch } };
      if (locale === "en" && patch.name !== undefined && !slugTouched) next.slug = slugify(patch.name);
      return next;
    });

  async function save() {
    const body = {
      slug: draft.slug,
      sortOrder: Number(draft.sortOrder) || 0,
      translations: { en: draft.en as CategoryTranslationInput, ...(draft.ar ? { ar: draft.ar as CategoryTranslationInput } : {}) },
    };
    const check = categoryUpsertSchema.safeParse(body);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Check the fields.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = isNew
      ? await adminRequest<AdminCategory[]>("POST", "/admin/categories", body)
      : await adminRequest<AdminCategory[]>("PUT", `/admin/categories/${draft.id}`, body);
    setBusy(false);
    if (!res.ok) {
      setError(res.body.message ?? "Couldn't save. Try again.");
      return;
    }
    if (!isNew) setSaved(draft);
    onSaved(res.data);
  }

  async function remove() {
    if (!draft.id || !window.confirm(`Delete the department “${draft.en.name}”?`)) return;
    setBusy(true);
    const res = await adminRequest("DELETE", `/admin/categories/${draft.id}`);
    if (!res.ok) {
      setBusy(false);
      setError(res.body.message ?? "Couldn't delete.");
      return;
    }
    onDeleted?.(draft.id);
  }

  const fields = (locale: "en" | "ar", t: Text) => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    const id = `${draft.id ?? "new"}-${locale}`;
    return (
      <div className="grid gap-3 sm:grid-cols-2" dir={dir}>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input id={`${id}-name`} dir={dir} value={t.name} onChange={(e) => setText(locale, { name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-short`}>Short name (menu chips)</Label>
          <Input id={`${id}-short`} dir={dir} value={t.short} onChange={(e) => setText(locale, { short: e.target.value })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-desc`}>Description (top of the department page)</Label>
          <Textarea id={`${id}-desc`} dir={dir} rows={2} value={t.description} onChange={(e) => setText(locale, { description: e.target.value })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-items`}>What it includes (home page cards)</Label>
          <Input id={`${id}-items`} dir={dir} value={t.items} onChange={(e) => setText(locale, { items: e.target.value })} />
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5" aria-label={draft.en.name || "New department"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{isNew ? "New department" : saved.en.name}</h2>
        {!isNew ? (
          <span className="text-sm text-muted-foreground">
            {draft.productCount} product{draft.productCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {fields("en", draft.en)}

      {draft.ar ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-sm font-semibold">Arabic</span>
          {fields("ar", draft.ar)}
          <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive" onClick={() => setDraft((d) => ({ ...d, ar: null }))}>
            Remove Arabic
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setDraft((d) => ({ ...d, ar: emptyText() }))}>
          <Plus /> Add Arabic
        </Button>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`${draft.id ?? "new"}-slug`}>Web address</Label>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            /shop/
            <Input
              id={`${draft.id ?? "new"}-slug`}
              className="w-60"
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setDraft((d) => ({ ...d, slug: slugify(e.target.value) }));
              }}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${draft.id ?? "new"}-order`}>Position</Label>
          <Input
            id={`${draft.id ?? "new"}-order`}
            className="w-20"
            inputMode="numeric"
            value={draft.sortOrder}
            onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value.replace(/\D/g, "") }))}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {!isNew ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={busy || draft.productCount > 0}
              title={draft.productCount > 0 ? "Move or delete its products first" : undefined}
              onClick={() => void remove()}
            >
              <Trash2 /> Delete
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="button" disabled={busy || (!isNew && !dirty)} onClick={() => void save()}>
            {busy ? "Saving…" : isNew ? "Create department" : dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
