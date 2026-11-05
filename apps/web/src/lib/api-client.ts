import type { ValidationIssue } from "@reactive-store/shared";

/**
 * Result of a browser call to the API. Never throws: network failures come back
 * as `{ ok: false, status: 0 }`, so forms can show a message instead of crashing.
 */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; body: { message?: string; issues?: ValidationIssue[]; missing?: string[] } };

/** POST JSON to the API on the same origin (Caddy in production, a Next rewrite in development). */
export async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, status: res.status, data: json as T } : { ok: false, status: res.status, body: json };
  } catch {
    return { ok: false, status: 0, body: {} };
  }
}

/**
 * Maps validation issues (e.g. `customer.phone` / `phone_invalid`) to translated
 * messages keyed by form field name (`phone`). `translate` gets the error code and
 * returns the customer's text; unknown codes should come back as a generic message.
 */
export function fieldErrors(issues: ValidationIssue[] | undefined, translate: (code: string) => string) {
  const errors: Record<string, string> = {};
  for (const { path, message } of issues ?? []) {
    const field = path.split(".").pop();
    if (field && !errors[field]) errors[field] = translate(message);
  }
  return errors;
}
