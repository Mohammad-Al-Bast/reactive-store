"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  orderStatusTransitions,
  paymentStatusSchema,
  type AdminOrderDetail,
  type AdminOrderUpdate,
  type OrderStatus,
  type PaymentStatus,
} from "@reactive-store/shared";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { adminRequest } from "@/lib/admin/client";
import { orderStatusAction, paymentStatusLabel } from "@/lib/admin/format";

/** Status buttons, payment status and an internal note for one order. */
export function OrderActions({
  number,
  status,
  paymentStatus,
}: {
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [payment, setPayment] = React.useState<PaymentStatus>(paymentStatus);
  const [pending, startTransition] = React.useTransition();

  async function save(change: AdminOrderUpdate) {
    if (change.status === "cancelled" && !window.confirm(`Cancel order ${number}?`)) return;
    setBusy(true);
    setError(null);
    const res = await adminRequest<AdminOrderDetail>("PATCH", `/admin/orders/${number}`, {
      ...change,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.body.message ?? "Couldn't save. Try again.");
      if (res.status === 409) startTransition(() => router.refresh());
      return;
    }
    setNote("");
    startTransition(() => router.refresh());
  }

  const next = orderStatusTransitions[status];
  const disabled = busy || pending;
  const paymentChanged = payment !== paymentStatus;

  return (
    <section aria-labelledby="h-actions" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 id="h-actions" className="font-bold">
        Update order
      </h2>

      <div className="grid gap-2">
        <Label htmlFor="note">
          Internal note <span className="font-normal text-muted-foreground">(optional, never shown to the customer)</span>
        </Label>
        <Textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Called, delivery on Friday"
          maxLength={2000}
        />
      </div>

      <div className="flex flex-col gap-2">
        {next.map((s, i) => (
          <Button
            key={s}
            type="button"
            variant={s === "cancelled" ? "outline" : i === 0 ? "default" : "secondary"}
            className={s === "cancelled" ? "text-destructive" : undefined}
            disabled={disabled}
            onClick={() => save({ status: s })}
          >
            {orderStatusAction[s]}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="payment">Payment</Label>
          <NativeSelect id="payment" value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)}>
            {paymentStatusSchema.options.map((p) => (
              <option key={p} value={p}>
                {paymentStatusLabel[p]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="button" variant="secondary" disabled={disabled || !paymentChanged} onClick={() => save({ paymentStatus: payment })}>
          Save
        </Button>
      </div>

      <Button type="button" variant="ghost" disabled={disabled || !note.trim()} onClick={() => save({})}>
        Add note only
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function ResendAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "busy" | "error">("idle");
  return (
    <button
      type="button"
      className="w-fit text-[13px] font-semibold text-brand hover:underline disabled:opacity-50"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const res = await adminRequest("POST", `/admin/alerts/${id}/resend`);
        setState(res.ok ? "idle" : "error");
        if (res.ok) setTimeout(() => router.refresh(), 1500);
      }}
    >
      {state === "busy" ? "Resending…" : state === "error" ? "Couldn't resend. Try again" : "Resend"}
    </button>
  );
}
