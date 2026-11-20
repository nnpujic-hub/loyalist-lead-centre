import Link from "next/link";

import type { ReportModel, ReportRange } from "@/lib/reports";
import { StatusBadge } from "@/components/status-badge";

const RANGES: { id: ReportRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {detail ? <p className="mt-2 text-sm text-navy">{detail}</p> : null}
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; count: number; percent?: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (rows.length === 0) return <p className="text-sm text-muted">n/a</p>;
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">{row.label}</span>
            <span className="text-muted">
              {row.count}
              {row.percent ? ` · ${row.percent}` : ""}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-2 rounded-full bg-navy" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Reports({ report }: { report: ReportModel }) {
  const maxWeek = Math.max(1, ...report.weeks.map((week) => week.count));
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => {
          const active = report.range === item.id;
          return (
            <Link
              key={item.id}
              href={item.id === "30d" ? "/reports" : `/reports?range=${item.id}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${active ? "bg-ink text-white" : "border border-line bg-white text-ink"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Leads in range" value={String(report.total)} />
        <Tile label="New this week" value={String(report.newThisWeek)} detail="Since Monday, inside this range" />
        <Tile label="New this month" value={String(report.newThisMonth)} detail="Since the 1st, inside this range" />
        <Tile label="Contacted" value={report.contactedRate} detail={`${report.contacted} of ${report.total}`} />
        <Tile label="Median first contact" value={report.medianLabel} detail="Created to first call, message, or email" />
        <Tile label="Average first contact" value={report.averageLabel} />
        <Tile label="Within 1 hour" value={report.within1hRate} detail={`${report.within1h} leads`} />
        <Tile label="Within 24 hours" value={report.within24hRate} detail={`${report.within24h} leads`} />
        <Tile label="Still uncontacted" value={String(report.uncontacted)} detail={`${report.overdue} older than 24 hours`} />
        <Tile label="Qualification rate" value={report.qualificationRate} detail="Qualified divided by leads in range" />
        <Tile label="Close rate" value={report.closeRate} detail="Closed divided by leads in range" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-display text-2xl uppercase tracking-wide">Status</h2>
          <div className="mt-4">
            <Bars rows={report.statuses} />
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-display text-2xl uppercase tracking-wide">Contact mix</h2>
          <p className="mt-1 text-sm text-muted">Counts each logged call, Facebook reply, and email. Timestamps fill in when the log is empty.</p>
          <div className="mt-4">
            <Bars rows={report.methods} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide">Leads by week</h2>
        <div className="mt-4 flex h-44 items-end gap-1 overflow-x-auto">
          {report.weeks.map((week) => (
            <div key={week.label} className="flex h-full min-w-8 flex-1 flex-col justify-end">
              <span className="text-center text-[10px] text-muted">{week.count}</span>
              <div
                className="mt-1 rounded-t bg-accent"
                style={{ height: `${Math.max(week.count === 0 ? 2 : 8, (week.count / maxWeek) * 100)}%` }}
              />
              <span className="mt-1 truncate text-center text-[10px] text-muted">{week.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-display text-2xl uppercase tracking-wide">Source</h2>
          <div className="mt-4">
            <Bars rows={report.sources} />
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-display text-2xl uppercase tracking-wide">Platform</h2>
          <div className="mt-4">
            <Bars rows={report.platforms} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide">Oldest uncontacted</h2>
        {report.oldest.length === 0 ? (
          <p className="mt-3 text-sm text-muted">n/a. Every lead in this range has a call, Facebook reply, or email.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {report.oldest.map((lead) => (
              <li key={lead.id}>
                <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block font-semibold">{lead.name}</span>
                    <span className="mt-1 block text-sm text-muted">Waiting {lead.age}</span>
                  </span>
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
