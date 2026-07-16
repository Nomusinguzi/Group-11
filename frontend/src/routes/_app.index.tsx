import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  HeartPulse,
  Droplets,
  Moon,
  Stethoscope,
  MapPin,
  Siren,
  CalendarDays,
  ArrowUpRight,
  Sparkles,
  Sun,
  Bell,
  ChevronRight,
  Clock,
  FlaskConical,
  Pill,
} from "lucide-react";
import { Card, Chip, IconTile, PageContainer, Stat } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";
import { useAppointments, useHistory, useProfile, useNotifications } from "@/lib/queries";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function greeting(): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", icon: <Sun size={14} className="text-amber-foreground" /> };
  if (h < 18) return { text: "Good afternoon", icon: <Sun size={14} className="text-amber-foreground" /> };
  return { text: "Good evening", icon: <Moon size={14} className="text-lavender-foreground" /> };
}

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: history } = useHistory();
  const { data: appointments } = useAppointments();
  const { data: notifications } = useNotifications();

  const g = greeting();
  const firstName = (user?.full_name ?? "").split(" ")[0] || "there";

  const now = new Date();
  const upcoming = (appointments ?? [])
    .filter((a) => a.status === "scheduled" && new Date(a.appointment_date) >= now)
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
    .slice(0, 3);

  const totals = {
    visits: history?.visits.length ?? 0,
    reports: history?.symptom_reports.length ?? 0,
    referrals: history?.referrals.length ?? 0,
    appointments: (appointments ?? []).filter((a) => a.status === "scheduled").length,
  };

  const recent = [
    ...(history?.visits ?? []).slice(0, 2).map((v) => ({
      icon: <Stethoscope size={16} />, tone: "primary" as const,
      title: `Visit at ${v.clinic_name}${v.diagnosis_summary ? ` — ${v.diagnosis_summary}` : ""}`,
      when: v.visit_date,
    })),
    ...(history?.symptom_reports ?? []).slice(0, 2).map((r) => ({
      icon: <Sparkles size={16} />, tone: "lavender" as const,
      title: `Symptom check — ${r.urgency_level}`,
      when: r.created_at,
    })),
    ...(history?.referrals ?? []).slice(0, 1).map((r) => ({
      icon: <FlaskConical size={16} />, tone: "amber" as const,
      title: `Referral: ${r.from_clinic} → ${r.to_clinic}`,
      when: r.created_at,
    })),
  ].slice(0, 5);

  return (
    <PageContainer>
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl border border-border gradient-hero p-6 sm:p-10">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-mint/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-lavender/30 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {g.icon}
              {g.text} · {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl">
              Hello, <span className="text-gradient-primary">{firstName}</span>.
              <br />
              Your care, all in one place.
            </h1>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              {totals.appointments > 0
                ? `You have ${totals.appointments} scheduled ${totals.appointments === 1 ? "appointment" : "appointments"}.`
                : "No upcoming appointments — start with an AI symptom check or find a nearby clinic."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/symptoms"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
              >
                <Stethoscope size={16} /> Start AI check-in
              </Link>
              <Link
                to="/clinics"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <MapPin size={16} /> Find nearby clinics
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Care activity
                  </p>
                  <p className="mt-1 font-display text-5xl text-foreground">{totals.visits + totals.reports}<span className="text-xl text-muted-foreground">/12 mo</span></p>
                </div>
                <RingScore value={Math.min(100, (totals.visits + totals.reports) * 8)} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Visits", value: totals.visits, icon: <Stethoscope size={14} />, tone: "primary" as const },
                  { label: "Checks", value: totals.reports, icon: <Sparkles size={14} />, tone: "lavender" as const },
                  { label: "Referrals", value: totals.referrals, icon: <FlaskConical size={14} />, tone: "mint" as const },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-border/60 bg-surface-elevated/70 p-3">
                    <IconTile icon={m.icon} tone={m.tone} size="sm" />
                    <p className="mt-2 text-[11px] text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-semibold">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="District" value={profile?.district || "—"} trend={profile?.sex || ""} icon={<MapPin size={18} />} tone="primary" />
        <Stat label="Scheduled visits" value={String(totals.appointments)} trend="Upcoming" icon={<CalendarDays size={18} />} tone="mint" />
        <Stat label="Symptom checks" value={String(totals.reports)} trend="All time" icon={<Activity size={18} />} tone="lavender" />
        <Stat label="Notifications" value={String((notifications ?? []).filter(n => !n.read_at).length)} trend="Unread" icon={<Bell size={18} />} tone="coral" />
      </div>

      {/* Main grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Upcoming care</h3>
              <p className="text-sm text-muted-foreground">Your next scheduled visits.</p>
            </div>
            <Link to="/appointments" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-80">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {upcoming.length === 0 && (
              <EmptyRow icon={<CalendarDays size={22} />} title="No upcoming appointments" body="Book a visit from the Clinics page to see it here." />
            )}
            {upcoming.map((a) => {
              const d = new Date(a.appointment_date);
              return (
                <motion.div
                  key={a.id}
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/40 p-4"
                >
                  <IconTile icon={<HeartPulse size={18} />} tone="primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{a.clinic_name ?? "Clinic"}</p>
                      <Chip tone="primary">Scheduled</Chip>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{a.reason || "General consultation"}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-xs text-muted-foreground">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                  </div>
                  <Link to="/appointments" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ArrowUpRight size={14} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Emergency + recent report */}
        <div className="space-y-6">
          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-coral/25 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <IconTile icon={<Siren size={18} />} tone="coral" />
                <div>
                  <p className="text-sm font-semibold">Emergency SOS</p>
                  <p className="text-xs text-muted-foreground">Response teams standing by</p>
                </div>
              </div>
              <Link
                to="/sos"
                className="mt-5 flex items-center justify-between rounded-2xl bg-coral px-4 py-3 text-sm font-semibold text-coral-foreground shadow-lg shadow-coral/30"
              >
                Trigger SOS
                <Siren size={16} />
              </Link>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Shares your live location with the nearest open clinic.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-xl">Latest symptom check</h3>
            <div className="mt-4 space-y-3">
              {(history?.symptom_reports ?? []).slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-xl bg-background/60 p-3">
                  <IconTile
                    icon={<Pill size={16} />}
                    tone={r.urgency_level === "emergency" ? "coral" : r.urgency_level === "soon" ? "amber" : "mint"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize">{r.urgency_level}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{r.advice_given}</p>
                  </div>
                </div>
              ))}
              {(history?.symptom_reports ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No symptom checks yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl">Recent activity</h3>
            <Chip>All time</Chip>
          </div>
          <div className="mt-5 divide-y divide-border/60">
            {recent.length === 0 && (
              <EmptyRow icon={<Clock size={22} />} title="No activity yet" body="Your visits, symptom checks and referrals appear here." />
            )}
            {recent.map((row, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5">
                <IconTile icon={row.icon} tone={row.tone} size="sm" />
                <p className="flex-1 truncate text-sm">{row.title}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(row.when).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function EmptyRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function RingScore({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} strokeWidth="8" className="fill-none stroke-primary/10" />
        <motion.circle
          cx="40" cy="40" r={r} strokeWidth="8" strokeLinecap="round"
          className="fill-none stroke-primary"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-primary">{Math.round(value)}</div>
    </div>
  );
}
