import {
  buildEnquiryMessage as buildEnquiryText,
  buildOrderMessage as buildOrderText,
  paymentMethodLabels,
  type EnquiryRole,
  type EnquiryTopic,
  type OrderSummary,
} from "@reactive-store/shared";

import { site } from "@/lib/site";

/*
 * WhatsApp messages go to the store's staff, so they stay in English whatever
 * language the customer is browsing in. The form labels customers see are in
 * the message files ("Enquiry.roles", "Enquiry.topics").
 */

const roleLabels: Record<EnquiryRole, string> = {
  physiotherapist: "Physiotherapist",
  "massage-therapist": "Massage or recovery therapist",
  "cupping-practitioner": "Hijama / cupping practitioner",
  "acupuncture-practitioner": "Acupuncture practitioner",
  clinic: "Clinic or centre",
  student: "Student or trainee",
  "home-care": "Individual / family (home care)",
};

const topicLabels: Record<EnquiryTopic, string> = {
  "product-advice": "Product advice",
  "practice-quote": "Quote for a practice",
  "group-order": "Student or group order",
  "existing-order": "Existing order",
  "warranty-repair": "Warranty or repair",
};

/** The saved order as a WhatsApp message, using the prices and English names the API confirmed. */
export function buildOrderMessage(order: OrderSummary) {
  return buildOrderText(order, { storeName: site.name, paymentLabel: paymentMethodLabels[order.paymentMethod] });
}

export type EnquiryDetails = { name: string; phone: string; role: EnquiryRole; topic?: EnquiryTopic; message: string };

export function buildEnquiryMessage(d: EnquiryDetails) {
  return buildEnquiryText(d, {
    storeName: site.name,
    roleLabel: roleLabels[d.role],
    topicLabel: d.topic ? topicLabels[d.topic] : undefined,
  });
}

/** Pre-filled WhatsApp text for asking about a product (English, by its English name). */
export function productEnquiryMessage(productName: string) {
  return `Hello ${site.name}, I'm interested in the ${productName}.`;
}

export const adviceMessage = `Hello ${site.name}, I'd like advice choosing a product.`;
