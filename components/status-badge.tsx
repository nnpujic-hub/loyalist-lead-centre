const styles: Record<string, string> = {
  Unread: "bg-accent text-white",
  Read: "bg-navy text-white",
  Called: "bg-white text-accent ring-1 ring-inset ring-accent",
  Messaged: "bg-white text-ink ring-1 ring-inset ring-ink",
  Emailed: "bg-white text-navy ring-1 ring-inset ring-navy",
  Qualified: "bg-success text-white",
  "Non-Qualified": "bg-muted text-white",
  Closed: "bg-ink text-white",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = styles[status] ?? "border border-line bg-white text-ink";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${tone}`}>
      {status || "No status"}
    </span>
  );
}
