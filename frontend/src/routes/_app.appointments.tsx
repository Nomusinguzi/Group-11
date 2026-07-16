import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Stethoscope, MoreHorizontal, Plus, Loader2, AlertCircle, X } from "lucide-react";
import { Card, Chip, IconTile, PageContainer, SectionHeader } from "@/components/ui-kit";
import { useAppointments, useCreateAppointment, useNearbyClinics, useGeolocation, useUpdateAppointmentStatus, type Appointment } from "@/lib/queries";
import { useSearch } from "@/lib/search-context";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/appointments")({
  component: AppointmentsPage,
});

const tabs = ["Upcoming", "Past", "Cancelled"] as const;

function AppointmentsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Upcoming");
  const [showBook, setShowBook] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const { query } = useSearch();

  const { data: appointments, isLoading, error, refetch } = useAppointments();
  const updateStatus = useUpdateAppointmentStatus();

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startDow = viewDate.getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (appointments ?? []).filter((a) => {
      const matchesQuery = !q ||
        [a.clinic_name, a.reason].filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
      if (!matchesQuery) return false;
      const d = new Date(a.appointment_date);
      if (tab === "Upcoming") return a.status === "scheduled" && d >= now;
      if (tab === "Past") return a.status === "completed" || (a.status === "scheduled" && d < now);
      if (tab === "Cancelled") return a.status === "cancelled" || a.status === "missed";
      return true;
    });
  }, [appointments, tab, query, now]);

  const upcomingCount = (appointments ?? []).filter((a) => a.status === "scheduled" && new Date(a.appointment_date) >= now).length;

  const dayHasAppt = new Set(
    (appointments ?? [])
      .filter((a) => {
        const d = new Date(a.appointment_date);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
      })
      .map((a) => new Date(a.appointment_date).getDate()),
  );

  const todayApptsList = (appointments ?? []).filter((a) => {
    const d = new Date(a.appointment_date);
    return d.toDateString() === now.toDateString();
  });

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Appointments"
        title="Plan and reschedule with a tap."
        description="Every visit across your clinics in one calendar."
        action={
          <button
            onClick={() => setShowBook(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={14} /> Book new
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Calendar */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl">{monthLabel}</h3>
            <div className="flex gap-1">
              <button onClick={() => setMonthOffset((o) => o - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-muted"><ChevronLeft size={14} /></button>
              <button onClick={() => setMonthOffset((o) => o + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-muted"><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: startDow }).map((_, i) => <div key={`p${i}`} />)}
            {days.map((d) => {
              const has = dayHasAppt.has(d);
              const isToday = monthOffset === 0 && d === now.getDate();
              return (
                <button
                  key={d}
                  className={`relative aspect-square rounded-xl text-sm font-medium transition-colors ${
                    isToday ? "bg-primary text-primary-foreground" : has ? "bg-primary/5 text-foreground hover:bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  {d}
                  {has && !isToday && <span className="absolute inset-x-0 bottom-1.5 mx-auto h-1 w-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Today</p>
            <p className="mt-1 font-display text-3xl">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {todayApptsList.length === 0
                ? "No appointments scheduled today. Take a walk 🌿"
                : `${todayApptsList.length} appointment${todayApptsList.length === 1 ? "" : "s"} today.`}
            </p>
          </div>
        </Card>

        {/* List */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-full border border-border bg-background/60 p-1">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Chip tone="mint">{upcomingCount} upcoming</Chip>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && (
              <div className="grid place-items-center py-10 text-muted-foreground"><Loader2 className="animate-spin" size={24} /></div>
            )}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/5 p-4">
                <IconTile icon={<AlertCircle size={16} />} tone="coral" size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Couldn't load appointments</p>
                  <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
                </div>
                <button onClick={() => refetch()} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Retry</button>
              </div>
            )}
            {!isLoading && !error && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <CalendarDays className="mx-auto text-muted-foreground" size={28} />
                <p className="mt-3 font-semibold">No {tab.toLowerCase()} appointments</p>
                <p className="text-xs text-muted-foreground">
                  {tab === "Upcoming" ? "Book a visit from a clinic to see it here." : "Nothing to show yet."}
                </p>
              </div>
            )}
            {filtered.map((a, i) => (
              <AppointmentRow
                key={a.id}
                appt={a}
                index={i}
                onCancel={() => updateStatus.mutate({ id: a.id, status: "cancelled" })}
                onComplete={() => updateStatus.mutate({ id: a.id, status: "completed" })}
                pending={updateStatus.isPending}
              />
            ))}
          </div>
        </Card>
      </div>

      {showBook && <BookDialog onClose={() => setShowBook(false)} />}
    </PageContainer>
  );
}

function AppointmentRow({ appt, index, onCancel, onComplete, pending }: {
  appt: Appointment; index: number; onCancel: () => void; onComplete: () => void; pending: boolean;
}) {
  const d = new Date(appt.appointment_date);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-border bg-background/40 p-4"
    >
      <div className="flex items-start gap-4">
        <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-primary/10 py-2 text-primary">
          <p className="text-[10px] font-semibold tracking-wider uppercase">
            {d.toLocaleDateString(undefined, { month: "short" })}
          </p>
          <p className="font-display text-2xl leading-none">{d.getDate()}</p>
          <p className="text-[10px] text-muted-foreground">
            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <IconTile icon={<Stethoscope size={18} />} tone="primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{appt.clinic_name || "Clinic"}</p>
            <Chip tone={
              appt.status === "scheduled" ? "primary" :
              appt.status === "completed" ? "mint" :
              appt.status === "cancelled" ? "coral" : "amber"
            }>{appt.status}</Chip>
          </div>
          <p className="text-xs text-muted-foreground">{appt.reason || "General consultation"}</p>
        </div>
        <button className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><MoreHorizontal size={16} /></button>
      </div>
      {appt.status === "scheduled" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={onComplete}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-70"
          >Mark completed</button>
          <button
            disabled={pending}
            onClick={onCancel}
            className="rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-[11px] font-semibold text-coral disabled:opacity-70"
          >Cancel</button>
        </div>
      )}
    </motion.div>
  );
}

function BookDialog({ onClose }: { onClose: () => void }) {
  const geo = useGeolocation();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => { geo().then(setCoords); }, [geo]);
  const { data: clinics, isLoading } = useNearbyClinics(coords, false);
  const create = useCreateAppointment();

  const [clinicId, setClinicId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!clinicId) return;
    create.mutate(
      { clinic_id: clinicId, appointment_date: `${date} ${time}:00`, reason: reason || undefined },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 p-4 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-border bg-surface-elevated p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Book new</p>
            <h3 className="mt-1 font-display text-2xl">Schedule a visit</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Clinic</span>
            <select
              value={clinicId ?? ""}
              onChange={(e) => setClinicId(e.target.value ? Number(e.target.value) : null)}
              className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"
            >
              <option value="">{isLoading ? "Loading clinics…" : "Select a clinic"}</option>
              {(clinics ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.distance_km != null ? ` · ${c.distance_km} km` : ""}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Reason (optional)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              rows={2} placeholder="e.g. follow-up on chest pain"
              className="w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary/40" />
          </label>
          {create.error && (
            <p className="text-xs text-coral">{(create.error as Error).message}</p>
          )}
          <button
            onClick={submit}
            disabled={!clinicId || create.isPending}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Confirm booking
          </button>
        </div>
      </motion.div>
    </div>
  );
}
