import { Accessibility, FlaskRound, Hand, Package, Syringe, Zap, type LucideProps } from "lucide-react";

const icons: Record<string, React.ComponentType<LucideProps>> = {
  "physiotherapy-rehabilitation": Zap,
  "massage-recovery": Hand,
  "cupping-therapy": FlaskRound,
  "medical-therapy-supplies": Syringe,
  "mobility-daily-living": Accessibility,
};

/** Icon for a category slug; categories added later in the admin get a generic icon. */
export function CategoryIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = icons[slug] ?? Package;
  return <Icon aria-hidden="true" {...props} />;
}
