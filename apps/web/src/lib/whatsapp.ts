import {
  buildEnquiryMessage as buildEnquiryText,
  buildOrderMessage as buildOrderText,
  type EnquiryRole,
  type EnquiryTopic,
  type OrderSummary,
} from "@reactive-store/shared";

import { site } from "@/lib/site";

/** Display labels for the enquiry form's role and topic ids. */
export const roleLabels: Record<EnquiryRole, string> = {
  physiotherapist: "Physiotherapist",
  "massage-therapist": "Massage or recovery therapist",
  "cupping-practitioner": "Hijama / cupping practitioner",
  "acupuncture-practitioner": "Acupuncture practitioner",
  clinic: "Clinic or centre",
  student: "Student or trainee",
  "home-care": "Individual / family (home care)",
};

export const topicLabels: Record<EnquiryTopic, string> = {
  "product-advice": "Product advice",
  "practice-quote": "Quote for a practice",
  "group-order": "Student or group order",
  "existing-order": "Existing order",
  "warranty-repair": "Warranty or repair",
};

/** The saved order as a WhatsApp message, using the prices the API confirmed. */
export function buildOrderMessage(order: OrderSummary) {
  const paymentLabel = site.paymentMethods.find((p) => p.id === order.paymentMethod)?.name ?? order.paymentMethod;
  return buildOrderText(order, { storeName: site.name, paymentLabel });
}

export type EnquiryDetails = { name: string; phone: string; role: EnquiryRole; topic?: EnquiryTopic; message: string };

export function buildEnquiryMessage(d: EnquiryDetails) {
  return buildEnquiryText(d, {
    storeName: site.name,
    roleLabel: roleLabels[d.role],
    topicLabel: d.topic ? topicLabels[d.topic] : undefined,
  });
}
