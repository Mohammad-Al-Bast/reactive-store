"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Field<K extends string> = { key: K; label: string; multiline?: boolean; placeholder?: string };

/** Rows of two fields (e.g. spec label + value), with add, remove and reorder. */
export function PairListEditor<K extends string>({
  legend,
  fields,
  rows,
  onChange,
  addLabel,
  dir,
}: {
  legend: string;
  fields: [Field<K>, Field<K>];
  rows: Record<K, string>[];
  onChange: (rows: Record<K, string>[]) => void;
  addLabel: string;
  dir?: "ltr" | "rtl";
}) {
  const id = React.useId();
  const empty = () => Object.fromEntries(fields.map((f) => [f.key, ""])) as Record<K, string>;
  const update = (i: number, key: K, value: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [row] = next.splice(i, 1);
    next.splice(i + by, 0, row!);
    onChange(next);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {fields.map((f) => {
              const fieldId = `${id}-${i}-${f.key}`;
              const Control = f.multiline ? Textarea : Input;
              return (
                <div key={f.key} className="grid gap-1">
                  <label htmlFor={fieldId} className="sr-only">
                    {f.label} {i + 1}
                  </label>
                  <Control
                    id={fieldId}
                    dir={dir}
                    placeholder={f.placeholder ?? f.label}
                    value={row[f.key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(i, f.key, e.target.value)}
                    {...(f.multiline ? { rows: 2 } : {})}
                  />
                </div>
              );
            })}
          </div>
          <RowButtons index={i} count={rows.length} onMove={move} onRemove={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => onChange([...rows, empty()])}>
        <Plus /> {addLabel}
      </Button>
    </fieldset>
  );
}

export function RowButtons({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (index: number, by: number) => void;
  onRemove: () => void;
}) {
  const btn = "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30";
  return (
    <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
      <button type="button" className={btn} aria-label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className={btn} aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index, 1)}>
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className={`${btn} hover:text-destructive`} aria-label="Remove" onClick={onRemove}>
        <X className="size-4" />
      </button>
    </div>
  );
}
