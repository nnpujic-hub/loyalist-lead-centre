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

export const metadata: Metadata = {
  title: {
    default: "Lead Centre · Loyalist Homes & Restoration",
    template: "%s · Loyalist Homes & Restoration",
  },
  description: "Sales desk for Loyalist Homes & Restoration Meta leads.",
  robots: { index: false, follow: false },
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
