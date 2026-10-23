/**
 * Product catalogue. Add, edit or remove products here.
 *
 * - price: a number in USD, or null to show "Price on request".
 * - image: a file in /public/images, or omit it to show a placeholder.
 * - Anything in [brackets] still needs the real detail from the packaging.
 */

export type CategorySlug =
  | "physiotherapy-rehabilitation"
  | "massage-recovery"
  | "cupping-therapy"
  | "medical-therapy-supplies"
  | "mobility-daily-living";

export type Category = {
  slug: CategorySlug;
  name: string;
  short: string;
  description: string;
  items: string;
};

export type Stock = "in-stock" | "low-stock" | "to-order";
export type Audience = "clinic" | "home" | "student";

export type Product = {
  slug: string;
  name: string;
  category: CategorySlug;
  type: string;
  summary: string;
  price: number | null;
  stock: Stock;
  image?: string;
  badge?: string;
  bestSeller?: boolean;
  audience: Audience[];
  description?: string;
  modes?: { name: string; text: string }[];
  inTheBox?: string[];
  specs?: { label: string; value: string }[];
  safety?: string;
  faq?: { q: string; a: string }[];
  related?: string[];
};

export const categories: Category[] = [
  {
    slug: "physiotherapy-rehabilitation",
    name: "Physiotherapy & Rehabilitation",
    short: "Physiotherapy",
    description:
      "Treatment tables, TENS and EMS devices, resistance bands and rehabilitation accessories for clinics, students and home recovery.",
    items: "Treatment tables, TENS / EMS devices, resistance bands, rehab accessories",
  },
  {
    slug: "massage-recovery",
    name: "Massage & Recovery",
    short: "Massage",
    description: "Massage guns, massage tools and therapeutic accessories for therapists and athletes.",
    items: "Massage guns, massage tools, therapeutic accessories",
  },
  {
    slug: "cupping-therapy",
    name: "Cupping Therapy",
    short: "Cupping",
    description: "Hijama cups, silicone cupping sets, vacuum cupping equipment and related accessories.",
    items: "Hijama cups, silicone sets, vacuum cupping equipment",
  },
  {
    slug: "medical-therapy-supplies",
    name: "Medical & Therapy Supplies",
    short: "Supplies",
    description: "Acupuncture needles, disposable medical supplies and professional treatment accessories.",
    items: "Acupuncture needles, disposables, treatment accessories",
  },
  {
    slug: "mobility-daily-living",
    name: "Mobility & Daily Living",
    short: "Daily living",
    description:
      "Toilet seat risers, patient support accessories and equipment that improves comfort, safety and independence.",
    items: "Toilet seat risers, patient support, comfort and safety aids",
  },
];

export const products: Product[] = [
  {
    slug: "4-in-1-tens-ems-unit",
    name: "4-in-1 TENS / EMS Therapy Unit",
    category: "physiotherapy-rehabilitation",
    type: "TENS & EMS",
    summary: "TENS, EMS, IF and Russian modes. 2 channels, 0–120 mA, lockable presets, large LCD.",
    price: null,
    stock: "in-stock",
    image: "/images/tens-unit.jpg",
    badge: "Best seller",
    bestSeller: true,
    audience: ["clinic", "home", "student"],
    description:
      "Four stimulation modes in one two-channel unit, for pain relief, muscle stimulation and rehabilitation in the clinic or at home.",
    modes: [
      { name: "TENS", text: "Transcutaneous nerve stimulation for pain relief." },
      { name: "EMS", text: "Electrical muscle stimulation for strengthening and re-education." },
      { name: "IF", text: "Interferential current for deeper tissue treatment." },
      { name: "RUSS", text: "Russian stimulation for muscle strength protocols." },
    ],
    inTheBox: [
      "4-in-1 therapy unit",
      "2 lead wires",
      "4 self-adhesive electrode pads",
      "[Charger / batteries, manual, case — confirm]",
    ],
    specs: [
      { label: "Modes", value: "TENS, EMS, IF, RUSS" },
      { label: "Channels", value: "2, independently adjustable" },
      { label: "Output intensity", value: "0–120 mA per channel" },
      { label: "Programs", value: "Multiple presets plus custom [number to confirm]" },
      { label: "Safety", value: "Key lock to prevent accidental changes" },
      { label: "Display", value: "Large backlit LCD" },
      { label: "Power", value: "[Rechargeable / battery — confirm]" },
      { label: "Certification", value: "[CE / FDA — confirm from packaging]" },
    ],
    safety:
      "Do not use with a pacemaker or other implanted electronic device, over the chest or head, during pregnancy without medical advice, or if you have epilepsy. Consult a physiotherapist or doctor before first use. [Have this reviewed against the manufacturer's manual.]",
    faq: [
      {
        q: "Is this suitable for home use?",
        a: "Yes, with preset programs and a lock function. We recommend a first session guided by a physiotherapist.",
      },
      { q: "Do you sell replacement electrode pads?", a: "Yes, pads and lead wires are always in stock." },
      { q: "What if it stops working?", a: "[Warranty and repair process — confirm.]" },
    ],
    related: ["electrode-pads", "lead-wires", "conductive-gel"],
  },
  {
    slug: "portable-treatment-table",
    name: "Portable Treatment Table",
    category: "physiotherapy-rehabilitation",
    type: "Treatment tables",
    summary: "Wood frame, height 25.2–33.7 in, face cradle and armrests, carry case included.",
    price: null,
    stock: "in-stock",
    image: "/images/treatment-table.jpg",
    badge: "Best seller",
    bestSeller: true,
    audience: ["clinic", "student"],
    description:
      "A folding wood-frame table for clinics, home visits and training, with adjustable height, face cradle and armrests.",
    inTheBox: ["Treatment table", "Face cradle", "Armrests", "Carry case with handle"],
    specs: [
      { label: "Overall length", value: "83.9 in" },
      { label: "Width", value: "23.6 in" },
      { label: "Adjustable height", value: "25.2 – 33.7 in" },
      { label: "Frame length", value: "63.4 in" },
      { label: "Folded size", value: "36.4 × 23.6 × 7.3 in" },
      { label: "Frame", value: "Wood" },
      { label: "Load capacity", value: "[kg — confirm]" },
    ],
    related: ["electric-treatment-table", "4-in-1-tens-ems-unit"],
  },
  {
    slug: "dual-channel-home-tens",
    name: "Dual-Channel Home TENS",
    category: "physiotherapy-rehabilitation",
    type: "TENS & EMS",
    summary: "[Model], rechargeable, [X] preset programs.",
    price: null,
    stock: "in-stock",
    audience: ["home"],
    related: ["electrode-pads", "conductive-gel"],
  },
  {
    slug: "electrode-pads",
    name: "Electrode Pads, Pack of [X]",
    category: "physiotherapy-rehabilitation",
    type: "Accessories",
    summary: "Self-adhesive, [size] cm, fits 2 mm pin leads.",
    price: null,
    stock: "in-stock",
    audience: ["clinic", "home", "student"],
  },
  {
    slug: "resistance-band-set",
    name: "Resistance Band Set",
    category: "physiotherapy-rehabilitation",
    type: "Resistance bands",
    summary: "[X] levels, latex-free [confirm], with door anchor.",
    price: null,
    stock: "low-stock",
    audience: ["home", "student", "clinic"],
  },
  {
    slug: "electric-treatment-table",
    name: "Electric Treatment Table",
    category: "physiotherapy-rehabilitation",
    type: "Treatment tables",
    summary: "[Sections], motorised height, [load] kg capacity.",
    price: null,
    stock: "to-order",
    audience: ["clinic"],
  },
  {
    slug: "loop-bands",
    name: "Loop Bands, 5 Levels",
    category: "physiotherapy-rehabilitation",
    type: "Resistance bands",
    summary: "Mini loop bands for lower-limb rehab and activation.",
    price: null,
    stock: "in-stock",
    audience: ["home", "student", "clinic"],
  },
  {
    slug: "conductive-gel",
    name: "Conductive Gel",
    category: "physiotherapy-rehabilitation",
    type: "Accessories",
    summary: "For electrotherapy and ultrasound use. [Volume] ml.",
    price: null,
    stock: "in-stock",
    audience: ["clinic", "home"],
  },
  {
    slug: "lead-wires",
    name: "Replacement Lead Wires",
    category: "physiotherapy-rehabilitation",
    type: "Accessories",
    summary: "2 mm pin, compatible with most TENS units.",
    price: null,
    stock: "in-stock",
    audience: ["clinic", "home"],
  },
  {
    slug: "percussion-massage-gun",
    name: "Percussion Massage Gun",
    category: "massage-recovery",
    type: "Massage guns",
    summary: "[Speeds] speeds, [number] heads, battery up to [X] hours.",
    price: null,
    stock: "in-stock",
    bestSeller: true,
    audience: ["clinic", "home"],
  },
  {
    slug: "silicone-cupping-set",
    name: "Silicone Cupping Set",
    category: "cupping-therapy",
    type: "Cupping sets",
    summary: "[Number] cups in [sizes], medical-grade silicone, storage case.",
    price: null,
    stock: "in-stock",
    bestSeller: true,
    audience: ["clinic", "home"],
  },
  {
    slug: "vacuum-cupping-set",
    name: "Vacuum Cupping Set with Pump",
    category: "cupping-therapy",
    type: "Vacuum cupping",
    summary: "[Number] cups, hand pump and extension hose.",
    price: null,
    stock: "in-stock",
    audience: ["clinic"],
  },
  {
    slug: "acupuncture-needles",
    name: "Acupuncture Needles, Box of [X]",
    category: "medical-therapy-supplies",
    type: "Needles",
    summary: "Sterile, single-use, [size] mm.",
    price: null,
    stock: "in-stock",
    audience: ["clinic", "student"],
  },
  {
    slug: "toilet-seat-riser",
    name: "Toilet Seat Riser",
    category: "mobility-daily-living",
    type: "Daily living aids",
    summary: "Raises seat height by [X] cm for safer, easier use.",
    price: null,
    stock: "in-stock",
    audience: ["home"],
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function productsIn(category: CategorySlug) {
  return products.filter((p) => p.category === category);
}

export const stockLabel: Record<Stock, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "to-order": "Available to order",
};

export const audienceLabel: Record<Audience, string> = {
  clinic: "Clinic & professional use",
  home: "Home use",
  student: "Students & training",
};
