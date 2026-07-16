import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, FlaskConical, Syringe, Stethoscope, Search, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Card, Chip, IconTile, PageContainer, SectionHeader } from "@/components/ui-kit";
import { useHistory } from "@/lib/queries";
import { useSearch } from "@/lib/search-context";

export const Route = createFileRoute("/_app/records")({
  component: RecordsPage,
});

const tabs = ["Timeline", "Visits", "Symptom reports", "Referrals"] as const;

type Row = {
  id: string; date: string; title: string; by: string; type: string;
  icon: React.ReactNode; tone: "primary" | "coral" | "mint" | "lavender" | "amber";
  tag: string;
};

function RecordsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Timeline");
  const { query, setQuery } = useSearch();
  const { data, isLoading, error, refetch } = useHistory();

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const visits: Row[] = data.visits.map((v) => ({
      id: `v-${v.id}`, date: v.visit_date, title: v.diagnosis_summary || "Visit recorded",
      by: v.clinic_name, type: "Visit", icon: <Stethoscope size={16} />, tone: "coral",
      tag: v.prescription ? `Rx: ${v.prescription}` : (v.notes ? "Notes on file" : "No prescription"),
    }));
    const reports: Row[] = data.symptom_reports.map((r) => ({
      id: `r-${r.id}`, date: r.created_at.slice(0, 10),
      title: `Symptom check — ${r.urgency_level}`,
      by: r.channel === "app" ? "SYM-CARE app" : "USSD *256#",
      type: "Symptom", icon: <Sparkles size={16} />,
      tone: r.urgency_level === "emergency" ? "coral" : r.urgency_level === "soon" ? "amber" : "mint",
      tag: r.advice_given.slice(0, 80) + (r.advice_given.length > 80 ? "…" : ""),
    }));
    const referrals: Row[] = data.referrals.map((rf) => ({
      id: `rf-${rf.id}`, date: rf.created_at.slice(0, 10),
      title: `Referral: ${rf.reason}`, by: `${rf.from_clinic} → ${rf.to_clinic}`,
      type: "Referral", icon: <FlaskConical size={16} />, tone: "lavender",
      tag: `Status: ${rf.status}`,
    }));
    return [...visits, ...reports, ...referrals].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const filtered = useMemo(() => {
    let out = rows;
    if (tab === "Visits") out = out.filter((r) => r.type === "Visit");
    if (tab === "Symptom reports") out = out.filter((r) => r.type === "Symptom");
    if (tab === "Referrals") out = out.filter((r) => r.type === "Referral");
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((r) => [r.title, r.by, r.tag].some((s) => s.toLowerCase().includes(q)));
    }
    return out;
  }, [rows, tab, query]);

  const counts = {
    visits: data?.visits.length ?? 0,
    reports: data?.symptom_reports.length ?? 0,
    referrals: data?.referrals.length ?? 0,
  };

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Medical records"
        title="Your health story, one place."
        description="Every visit, referral, and symptom check — encrypted end-to-end, always with you."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Visits", value: counts.visits, icon: <Stethoscope size={16} />, tone: "primary" as const },
          { label: "Symptom checks", value: counts.reports, icon: <Sparkles size={16} />, tone: "lavender" as const },
          { label: "Referrals", value: counts.referrals, icon: <Syringe size={16} />, tone: "mint" as const },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <IconTile icon={s.icon} tone={s.tone} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-display text-2xl">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <div className="relative flex-1 min-w-64">
            <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search records, clinics, advice…"
              className="h-10 w-full rounded-full border border-border bg-background/60 pr-4 pl-11 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div className="flex gap-1 rounded-full border border-border bg-background/60 p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="animate-spin" size={24} />
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/5 p-4">
              <IconTile icon={<AlertCircle size={16} />} tone="coral" size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Couldn't load records</p>
                <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
              </div>
              <button onClick={() => refetch()} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Retry</button>
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <FileText className="mx-auto text-muted-foreground" size={28} />
              <p className="mt-3 font-semibold">No records yet</p>
              <p className="text-xs text-muted-foreground">Your medical history will appear here.</p>
            </div>
          )}
          {filtered.map((r) => {
            const d = new Date(r.date);
            return (
              <div key={r.id} className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-primary/30 hover:bg-background/70">
                <div className="hidden text-right sm:block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                    {d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.getFullYear()}</p>
                </div>
                <div className="hidden h-full w-px bg-border sm:block" style={{ minHeight: 40 }} />
                <IconTile icon={r.icon} tone={r.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <Chip>{r.type}</Chip>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.by} · {r.tag}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </PageContainer>
  );
}
