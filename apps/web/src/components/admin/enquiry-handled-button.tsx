"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/admin/client";

export function EnquiryHandledButton({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [failed, setFailed] = React.useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant={handled ? "ghost" : "secondary"}
      disabled={busy || pending}
      onClick={async () => {
        setBusy(true);
        const res = await adminRequest("PATCH", `/admin/enquiries/${id}`, { handled: !handled });
        setBusy(false);
        setFailed(!res.ok);
        if (res.ok) startTransition(() => router.refresh());
      }}
    >
      {failed ? (
        "Couldn't save. Retry"
      ) : handled ? (
        <>
          <RotateCcw /> Reopen
        </>
      ) : (
        <>
          <Check /> Mark handled
        </>
      )}
    </Button>
  );
}
