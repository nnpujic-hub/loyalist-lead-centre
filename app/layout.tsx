import type { Metadata, Viewport } from "next";
import { Montserrat, Oswald } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const metadataBase = new URL(
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Lead Centre · Rural Building Solutions",
    template: "%s · Rural Building Solutions",
  },
  description: "Sales desk for Rural Building Solutions Meta leads.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Lead Centre · Rural Building Solutions",
    description: "Sales desk for Rural Building Solutions Meta leads.",
    images: [{ url: "/rbs-logo.png", alt: "Rural Building Solutions" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#141414",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">{children}</body>
    </html>
  );
}
