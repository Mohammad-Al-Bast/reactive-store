"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { loginSchema, type AdminProfile } from "@reactive-store/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { refreshSession } from "@/lib/admin/client";
import { postJson } from "@/lib/api-client";

/** Only paths on this site, so `?next=` can't send people to another website. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && !next.startsWith("/login")
    ? next
    : "/";
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [checking, setChecking] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // A still-valid refresh cookie signs the admin straight back in.
  React.useEffect(() => {
    let cancelled = false;
    refreshSession().then((ok) => {
      if (cancelled) return;
      if (ok) window.location.replace(next);
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [next]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const f = new FormData(e.currentTarget);
    const input = { email: String(f.get("email") ?? ""), password: String(f.get("password") ?? "") };
    const check = loginSchema.safeParse(input);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await postJson<{ admin: AdminProfile }>("/auth/login", input);
    if (res.ok) {
      // A full navigation, so the server renders the panel with the new cookie.
      window.location.replace(next);
      return;
    }
    setSubmitting(false);
    setError(
      res.status === 401
        ? "Email or password is incorrect."
        : res.status === 429
          ? "Too many attempts. Wait 15 minutes and try again."
          : "Couldn't sign in. Check your connection and try again.",
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-7 flex items-center gap-3">
        <Image src="/images/logo.png" alt="" width={44} height={44} className="size-11 rounded-full" priority />
        <div className="leading-tight">
          <div className="font-serif text-xl font-semibold">Reactive Store</div>
          <div className="text-sm text-muted-foreground">Admin</div>
        </div>
      </div>
      {checking ? (
        <p className="py-6 text-center text-muted-foreground" role="status">
          Checking your session…
        </p>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <h1 className="text-lg font-bold">Sign in</h1>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" autoFocus required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      )}
    </div>
  );
}
