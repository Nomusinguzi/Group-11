import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Siren, MapPin, Phone, Shield, Clock, User, CheckCircle2, Ambulance, Radio, Loader2, AlertTriangle } from "lucide-react";
import { Card, Chip, IconTile, PageContainer, SectionHeader } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";
import { useGeolocation, useSosAlert, useTriggerSos } from "@/lib/queries";

export const Route = createFileRoute("/_app/sos")({
  component: SosPage,
});

const timeline = [
  { key: "dispatched", label: "SOS triggered", desc: "Location shared with nearest open clinic", icon: <Radio size={16} />, tone: "coral" },
  { key: "en_route", label: "Responder en route", desc: "Clinic team confirmed dispatch", icon: <Ambulance size={16} />, tone: "amber" },
  { key: "arrived", label: "On site", desc: "Responder has arrived", icon: <CheckCircle2 size={16} />, tone: "mint" },
] as const;

function SosPage() {
  const { user } = useAuth();
  const geo = useGeolocation();
  const trigger = useTriggerSos();
  const [alertId, setAlertId] = useState<number | null>(null);
  const { data: alert } = useSosAlert(alertId);

  const triggered = trigger.data ?? null;
  const activeStatus = alert?.status ?? triggered?.status ?? null;
  const stage = activeStatus === "arrived" ? 2 : activeStatus === "en_route" ? 1 : activeStatus ? 0 : -1;

  const handleTrigger = async () => {
    const coords = await geo();
    const res = await trigger.mutateAsync(coords);
    setAlertId(res.alert_id);
  };

  const firstName = (user?.full_name ?? "").split(" ")[0] || "";

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Emergency SOS"
        title={triggered ? `Help is on the way, ${firstName}.` : `In an emergency, tap the button.`}
        description={triggered
          ? "Stay where you are if it's safe. Your location has been shared with responders."
          : "This will share your live location with the nearest open clinic in our network."}
        action={triggered ? <Chip tone="coral">Live · Priority 1</Chip> : <Chip tone="mint">Standing by</Chip>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Big SOS card */}
        <Card className="relative overflow-hidden p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-coral/15 via-transparent to-transparent" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative grid place-items-center">
              {triggered && (
                <>
                  <motion.span
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="absolute h-44 w-44 rounded-full bg-coral"
                  />
                  <motion.span
                    animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
                    transition={{ duration: 1.8, delay: 0.6, repeat: Infinity }}
                    className="absolute h-44 w-44 rounded-full bg-coral"
                  />
                </>
              )}
              <button
                onClick={handleTrigger}
                disabled={trigger.isPending || !!triggered}
                className="relative grid h-40 w-40 place-items-center rounded-full bg-coral text-coral-foreground shadow-2xl shadow-coral/40 transition-transform hover:scale-105 active:scale-95 disabled:opacity-90"
              >
                {trigger.isPending ? <Loader2 size={44} className="animate-spin" /> : <Siren size={44} />}
              </button>
            </div>
            {triggered ? (
              <>
                <p className="mt-6 text-xs font-semibold tracking-widest text-coral uppercase">Assigned clinic</p>
                <p className="font-display text-3xl">{triggered.assigned_clinic.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {triggered.assigned_clinic.distance_km} km away
                  {triggered.assigned_clinic.phone ? ` · ${triggered.assigned_clinic.phone}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="mt-6 text-xs font-semibold tracking-widest text-coral uppercase">Tap to trigger</p>
                <p className="font-display text-3xl">Hold on for 1 second</p>
                <p className="mt-1 text-sm text-muted-foreground">The button dispatches the nearest open clinic.</p>
              </>
            )}

            {trigger.error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-coral/30 bg-coral/5 px-4 py-3 text-left text-xs text-coral">
                <AlertTriangle size={14} className="mt-0.5" />
                {(trigger.error as Error).message}
              </div>
            )}

            {triggered && triggered.assigned_clinic.phone && (
              <div className="mt-6 grid w-full grid-cols-2 gap-2">
                <a
                  href={`tel:${triggered.assigned_clinic.phone}`}
                  className="rounded-2xl border border-border bg-surface-elevated py-3 text-xs font-semibold"
                >
                  <Phone className="mx-auto mb-1" size={16} />
                  Call clinic
                </a>
                <button className="rounded-2xl bg-coral py-3 text-xs font-semibold text-coral-foreground opacity-80" disabled>
                  <MapPin className="mx-auto mb-1" size={16} />
                  Share pin
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Timeline + info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display text-2xl">Response timeline</h3>
            <div className="mt-5 space-y-4">
              {timeline.map((t, i) => {
                const done = triggered !== null && i <= stage;
                const current = triggered !== null && i === stage;
                return (
                  <div key={t.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`relative grid h-9 w-9 place-items-center rounded-full ${
                        done ? (current ? "bg-primary text-primary-foreground" : "bg-mint text-mint-foreground") : "bg-muted text-muted-foreground"
                      }`}>
                        {t.icon}
                        {current && (
                          <motion.span
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity }}
                            className="absolute inset-0 rounded-full bg-primary/60"
                          />
                        )}
                      </div>
                      {i < timeline.length - 1 && <div className={`mt-1 w-0.5 flex-1 ${done ? "bg-primary/40" : "bg-border"}`} style={{ minHeight: 24 }} />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {!triggered && (
              <p className="mt-2 text-xs text-muted-foreground">Timeline activates once SOS is triggered.</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <IconTile icon={<Shield size={18} />} tone="primary" />
              <div>
                <h3 className="font-display text-xl">Your medical ID</h3>
                <p className="text-xs text-muted-foreground">
                  {user ? "Sent with your SOS alert." : "Sign in to attach your medical ID."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                { k: "Name", v: user?.full_name ?? "—" },
                { k: "Phone", v: user?.phone ?? "—" },
                { k: "Role", v: user?.role ?? "—" },
                { k: "User ID", v: user?.id ? `#${user.id}` : "—" },
              ].map((r) => (
                <div key={r.k} className="rounded-xl bg-background/60 p-3">
                  <p className="text-[11px] text-muted-foreground">{r.k}</p>
                  <p className="font-semibold capitalize">{r.v}</p>
                </div>
              ))}
            </div>
          </Card>

          {alert && (
            <Card className="p-6">
              <h3 className="font-display text-xl">Latest status</h3>
              <div className="mt-4 divide-y divide-border/60">
                <div className="flex items-center gap-3 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <User size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{alert.clinic_name ?? "Nearest clinic"}</p>
                    <p className="text-xs text-muted-foreground">{alert.clinic_phone ?? "No phone on file"}</p>
                  </div>
                  <Chip tone={alert.status === "arrived" ? "mint" : alert.status === "cancelled" ? "coral" : "amber"}>
                    <Clock size={10} className="mr-1" />
                    {alert.status.replace("_", " ")}
                  </Chip>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
