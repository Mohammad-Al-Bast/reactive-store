import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

const newsreader = localFont({
  src: "./fonts/newsreader-latin-wght-normal.woff2",
  variable: "--font-newsreader",
  weight: "200 800",
  display: "swap",
});

const publicSans = localFont({
  src: "./fonts/public-sans-latin-wght-normal.woff2",
  variable: "--font-public-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Admin — Reactive Store", template: "%s · Admin — Reactive Store" },
  robots: { index: false, follow: false },
};

/** Root layout for the admin site: English only and never indexed. */
export default function AdminRootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={`${newsreader.variable} ${publicSans.variable} h-full`}>
      <body className="min-h-full bg-background">{children}</body>
    </html>
  );
}
