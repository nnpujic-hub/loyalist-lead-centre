import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Lead Centre",
};

export default function HomePage() {
  return <Dashboard />;
}
