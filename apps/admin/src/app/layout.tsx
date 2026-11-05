import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

// Same fonts as the store: Fraunces for headings, DM Sans for text.
const fraunces = localFont({
  src: "./fonts/fraunces-latin-opsz-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Admin — Reactive Store", template: "%s · Admin — Reactive Store" },
  robots: { index: false, follow: false },
};

/** Root layout for the admin site: English only and never indexed. */
export default function AdminRootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={`${fraunces.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full bg-background">{children}</body>
    </html>
  );
}
