import type { Metadata } from "next";

import { Reports } from "@/components/reports";
import { Shell } from "@/components/shell";
import { listLeads } from "@/lib/leads";
import { buildReport, parseReportRange } from "@/lib/reports";
import { requireSession } from "@/lib/require-session";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireSession();
  const params = await searchParams;
  const range = parseReportRange(params.range);
  const data = await listLeads();
  const report = buildReport(data.leads, range);

  return (
    <Shell demo={data.demo}>
      <main id="content" className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          How quickly the team reaches new leads. Times are Eastern. A lead is contacted at the earliest of Called At, Messaged At, and Emailed At.
        </p>
        <div className="mt-5">
          <Reports report={report} />
        </div>
      </main>
    </Shell>
  );
}
