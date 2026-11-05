import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <div className="container-page flex max-w-2xl flex-col items-start gap-4 py-24">
      <p className="eyebrow text-brand">{t("eyebrow")}</p>
      <h1 className="display text-[44px] leading-tight">{t("title")}</h1>
      <p className="text-[17px] text-body">{t("text")}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/shop">{t("shop")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">{t("contact")}</Link>
        </Button>
      </div>
    </div>
  );
}
