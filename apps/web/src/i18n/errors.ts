"use client";

import { formErrorCodes, type FormErrorCode } from "@reactive-store/shared";
import { useTranslations } from "next-intl";

/** Translates a form error code from the shared schemas (or the API) into the customer's language. */
export function useErrorText() {
  const t = useTranslations("Errors");
  return (code: string) =>
    (formErrorCodes as readonly string[]).includes(code) ? t(code as FormErrorCode) : t("invalid");
}
