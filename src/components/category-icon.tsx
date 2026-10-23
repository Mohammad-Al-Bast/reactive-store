import { Accessibility, FlaskRound, Hand, Syringe, Zap, type LucideProps } from "lucide-react";

import type { CategorySlug } from "@/lib/products";

const icons: Record<CategorySlug, React.ComponentType<LucideProps>> = {
  "physiotherapy-rehabilitation": Zap,
  "massage-recovery": Hand,
  "cupping-therapy": FlaskRound,
  "medical-therapy-supplies": Syringe,
  "mobility-daily-living": Accessibility,
};

export function CategoryIcon({ slug, ...props }: { slug: CategorySlug } & LucideProps) {
  const Icon = icons[slug];
  return <Icon aria-hidden="true" {...props} />;
}
