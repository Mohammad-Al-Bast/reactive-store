import { describe, expect, it } from "vitest";
import { createEnquirySchema, createOrderSchema, orderNumberPattern, phoneSchema } from "./forms.js";
import { buildOrderMessage } from "./messages.js";

describe("phoneSchema", () => {
  it.each(["81 164 065", "+961 81 164 065", "03-123456", "(01) 234 567", "96181164065"])("accepts %s", (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(true);
  });

  it.each(["", "12345", "call me", "+961 81 abc 065", "1234567890123456"])("rejects %j", (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(false);
  });
});

const order = {
  items: [{ slug: "electrode-pads", qty: 2 }],
  customer: { name: " Rana ", phone: "81 164 065", governorate: "Bekaa", city: "Shtoura", address: "Bldg 4" },
  paymentMethod: "cod",
};

describe("createOrderSchema", () => {
  it("accepts a valid order, trims text and defaults the locale", () => {
    const parsed = createOrderSchema.parse(order);
    expect(parsed.customer.name).toBe("Rana");
    expect(parsed.locale).toBe("en");
  });

  it("ignores any price the browser sends", () => {
    const parsed = createOrderSchema.parse({ ...order, items: [{ slug: "electrode-pads", qty: 1, price: 0.01 }] });
    expect(parsed.items[0]).toEqual({ slug: "electrode-pads", qty: 1 });
  });

  it.each([
    ["an empty cart", { items: [] }],
    ["a zero quantity", { items: [{ slug: "electrode-pads", qty: 0 }] }],
    ["an unknown governorate", { customer: { ...order.customer, governorate: "Paris" } }],
    ["a blank address", { customer: { ...order.customer, address: "   " } }],
    ["an unknown payment method", { paymentMethod: "card" }],
  ])("rejects %s", (_, patch) => {
    expect(createOrderSchema.safeParse({ ...order, ...patch }).success).toBe(false);
  });
});

describe("createEnquirySchema", () => {
  const enquiry = { name: "Sami", phone: "03 123 456", role: "student", message: "Need a table" };

  it("accepts a valid enquiry", () => {
    expect(createEnquirySchema.safeParse(enquiry).success).toBe(true);
  });

  it("rejects an unknown role or topic", () => {
    expect(createEnquirySchema.safeParse({ ...enquiry, role: "Student or trainee" }).success).toBe(false);
    expect(createEnquirySchema.safeParse({ ...enquiry, topic: "anything" }).success).toBe(false);
  });
});

describe("orderNumberPattern", () => {
  it("matches the store's order references", () => {
    expect(orderNumberPattern.test("RS-261105-K3QZ7W")).toBe(true);
    expect(orderNumberPattern.test("RS-261105-K3QZ")).toBe(false);
    expect(orderNumberPattern.test("RS-261105-K3QZ7I")).toBe(false); // no I, L, O or U
  });
});

describe("buildOrderMessage", () => {
  it("lists priced and on-request lines and flags the total", () => {
    const text = buildOrderMessage(
      {
        number: "RS-261105-K3QZ7W",
        createdAt: "2026-11-05T10:00:00.000Z",
        items: [
          { slug: "tens", name: "TENS", qty: 2, unitPrice: 70 },
          { slug: "gel", name: "Gel", qty: 1, unitPrice: null },
        ],
        subtotal: 140,
        totalToConfirm: true,
        paymentMethod: "cod",
        customer: { name: "Rana", phone: "81 164 065", governorate: "Bekaa", city: "Shtoura", address: "Bldg 4" },
      },
      { storeName: "Reactive Store", paymentLabel: "Cash on delivery" },
    );
    expect(text).toContain("New order RS-261105-K3QZ7W — Reactive Store");
    expect(text).toContain("• 2 × TENS — $140.00");
    expect(text).toContain("• 1 × Gel — price on request");
    expect(text).toContain("Subtotal: $140.00 + items on request");
    expect(text).not.toContain("Notes:");
  });
});
