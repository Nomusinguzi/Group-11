import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MapPin, Clock, Phone, Navigation, Filter, Search, Stethoscope, Pill, AlertCircle, Loader2, CalendarPlus } from "lucide-react";
import { Card, Chip, IconTile, PageContainer, SectionHeader } from "@/components/ui-kit";
import { useCreateAppointment, useGeolocation, useNearbyClinics, type Clinic } from "@/lib/queries";
import { useSearch } from "@/lib/search-context";

export const Route = createFileRoute("/_app/clinics")({
  component: ClinicsPage,
});

const STOCK_TONE: Record<Clinic["medication_stock"], "mint" | "amber" | "coral"> = {
  full: "mint", limited: "amber", out_of_stock: "coral",
};

function ClinicsPage() {
  const geo = useGeolocation();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const { query, setQuery } = useSearch();
  const [locationLabel, setLocationLabel] = useState("Detecting location…");

  useEffect(() => {
    geo().then((c) => {
      setCoords(c);
      setLocationLabel(`${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`);
    });
  }, [geo]);

  const { data: clinics, isLoading, error, refetch } = useNearbyClinics(coords, openOnly);

  const filtered = (clinics ?? []).filter((c) =>
    !query
      ? true
      : [c.name, c.district, c.specialist_on_duty].filter(Boolean).some((s) =>
          String(s).toLowerCase().includes(query.toLowerCase()),
        ),
  );

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Clinic finder"
        title="Care near you, verified in real time."
        description="Live availability, medication stock, and directions — all from your local health network."
      />

      {/* Search + filters */}
      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clinic, district, specialist…"
              className="h-11 w-full rounded-full border border-border bg-background/60 pr-4 pl-11 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div className="relative">
            <MapPin size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
            <input
              readOnly value={locationLabel}
              className="h-11 w-full rounded-full border border-border bg-background/60 pr-4 pl-11 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <button
            onClick={() => setOpenOnly((v) => !v)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
              openOnly ? "bg-primary text-primary-foreground" : "border border-border bg-surface-elevated"
            }`}
          >
            <Filter size={14} /> {openOnly ? "Open only" : "All clinics"}
          </button>
        </div>
      </Card>

      {/* Grid: list + map */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {isLoading && <LoadingRows />}
          {error && (
            <ErrorRow message={(error as Error).message} onRetry={() => refetch()} />
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <EmptyState title="No clinics found" body={query ? "Try a different search term." : "There are no clinics available for your location yet."} />
          )}
          {filtered.map((c, i) => (
            <ClinicCard key={c.id} clinic={c} index={i} />
          ))}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden p-0">
            <div className="relative h-80 bg-gradient-to-br from-primary/20 via-mint/20 to-lavender/20">
              <MapMock clinics={filtered.slice(0, 6)} />
              <div className="absolute right-3 bottom-3 rounded-xl border border-border bg-surface-elevated/90 px-3 py-2 text-xs font-semibold backdrop-blur">
                {filtered.length} in view
              </div>
            </div>
            <div className="p-5">
              <h4 className="font-display text-xl">Live availability</h4>
              <p className="text-xs text-muted-foreground">
                {coords ? "Ranked by distance from your location" : "Waiting for location…"}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                {filtered.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${c.status === "open" ? "bg-mint" : "bg-muted-foreground"}`} />
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.distance_km != null && (
                      <span className="text-xs text-muted-foreground">{c.distance_km} km</span>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nothing to show yet.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function ClinicCard({ clinic, index }: { clinic: Clinic; index: number }) {
  const create = useCreateAppointment();
  const [booked, setBooked] = useState(false);

  const book = () => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    dt.setHours(10, 0, 0, 0);
    create.mutate(
      { clinic_id: clinic.id, appointment_date: dt.toISOString().slice(0, 19).replace("T", " "), reason: "General consultation" },
      { onSuccess: () => setBooked(true) },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="surface-card p-5"
    >
      <div className="flex items-start gap-4">
        <IconTile icon={<Stethoscope size={20} />} tone={clinic.status === "open" ? "primary" : "amber"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{clinic.name}</h3>
            {clinic.status === "open" ? <Chip tone="mint">Open now</Chip> : <Chip tone="amber">Closed</Chip>}
            <Chip tone={STOCK_TONE[clinic.medication_stock]}>
              <Pill size={10} className="mr-1" />
              {clinic.medication_stock.replace("_", " ")}
            </Chip>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {clinic.specialist_on_duty || "General practice"} · {clinic.district || "Unknown district"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {clinic.distance_km != null && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin size={12} /> {clinic.distance_km} km away
              </span>
            )}
            {clinic.phone && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Phone size={12} /> {clinic.phone}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-mint-foreground">
              <Clock size={12} /> {clinic.status === "open" ? "Accepting patients" : "Closed"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={book}
          disabled={create.isPending || booked}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-70"
        >
          {create.isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
          {booked ? "Booked ✓" : "Book visit"}
        </button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${clinic.lat},${clinic.lng}`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold"
        >
          <Navigation size={12} /> Directions
        </a>
        {clinic.phone && (
          <a
            href={`tel:${clinic.phone}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold"
          >
            <Phone size={12} /> Call
          </a>
        )}
      </div>
    </motion.div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="surface-card animate-pulse p-5">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <IconTile icon={<AlertCircle size={18} />} tone="coral" />
        <div className="flex-1">
          <p className="font-semibold">Couldn't load clinics</p>
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        </div>
        <button onClick={onRetry} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Retry
        </button>
      </div>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <MapPin className="mx-auto text-muted-foreground" size={28} />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function MapMock({ clinics }: { clinics: Clinic[] }) {
  const w = 400, h = 320;
  if (clinics.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
        <rect width={w} height={h} fill="url(#grid)" />
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground/8" />
          </pattern>
        </defs>
      </svg>
    );
  }
  const lats = clinics.map((c) => Number(c.lat));
  const lngs = clinics.map((c) => Number(c.lng));
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 40;
  const x = (lng: number) => pad + ((lng - minLng) / Math.max(0.0001, maxLng - minLng)) * (w - 2 * pad);
  const y = (lat: number) => h - pad - ((lat - minLat) / Math.max(0.0001, maxLat - minLat)) * (h - 2 * pad);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
      <defs>
        <pattern id="grid2" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground/8" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#grid2)" />
      {clinics.map((c) => {
        const tone = c.status === "open" ? "var(--mint)" : "var(--amber)";
        return (
          <g key={c.id}>
            <circle cx={x(Number(c.lng))} cy={y(Number(c.lat))} r="14" fill={tone} opacity="0.25" />
            <circle cx={x(Number(c.lng))} cy={y(Number(c.lat))} r="7" fill={tone} />
          </g>
        );
      })}
    </svg>
  );
}
