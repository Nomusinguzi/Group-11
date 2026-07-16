import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Stethoscope,
  HeartPulse,
  ThermometerSun,
  Wind,
  Droplets,
  Bone,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Sparkles,
  MapPin,
  Phone,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, Chip, IconTile, PageContainer, SectionHeader } from "@/components/ui-kit";
import { useSubmitSymptoms } from "@/lib/queries";

export const Route = createFileRoute("/_app/symptoms")({
  component: SymptomsPage,
});

const steps = ["Symptoms", "Duration", "Location", "Result"] as const;

type Flag = "chestPain" | "breathingDifficulty" | "heavyBleeding" | "lossOfConsciousness" | "fever";

const SYMPTOM_OPTIONS: { key: Flag; label: string; icon: typeof HeartPulse; tone: "coral" | "primary" | "amber" | "mint" | "lavender" }[] = [
  { key: "chestPain", label: "Chest pain", icon: HeartPulse, tone: "coral" },
  { key: "breathingDifficulty", label: "Breathing difficulty", icon: Wind, tone: "primary" },
  { key: "heavyBleeding", label: "Heavy bleeding", icon: Droplets, tone: "coral" },
  { key: "lossOfConsciousness", label: "Loss of consciousness", icon: Bone, tone: "lavender" },
  { key: "fever", label: "Fever", icon: ThermometerSun, tone: "amber" },
];

const DURATION_OPTIONS = [
  { label: "Just now", days: 0 },
  { label: "1–2 days", days: 2 },
  { label: "3–6 days", days: 4 },
  { label: "A week or more", days: 8 },
];

const LOCATIONS = ["Head", "Chest", "Abdomen", "Back", "Limbs", "Other"];

function SymptomsPage() {
  const [step, setStep] = useState(0);
  const [flags, setFlags] = useState<Record<Flag, boolean>>({
    chestPain: false, breathingDifficulty: false, heavyBleeding: false,
    lossOfConsciousness: false, fever: false,
  });
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [painLocation, setPainLocation] = useState<string>("");

  const submit = useSubmitSymptoms();

  const canNext = step === 0 ? true : step === 1 ? durationDays != null : true;

  const goNext = () => {
    if (step === 2) {
      submit.mutate(
        { ...flags, durationDays: durationDays ?? 0, painLocation: painLocation || undefined },
        { onSuccess: () => setStep(3) },
      );
    } else {
      setStep((s) => s + 1);
    }
  };

  const reset = () => {
    setStep(0);
    setFlags({ chestPain: false, breathingDifficulty: false, heavyBleeding: false, lossOfConsciousness: false, fever: false });
    setDurationDays(null);
    setPainLocation("");
    submit.reset();
  };

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="AI symptom check"
        title="Let's understand what you're feeling."
        description="A calm, private, 60-second assessment. Not a diagnosis — it helps you decide the next step."
      />

      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
              i < step ? "bg-mint text-mint-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="h-0.5 flex-1 rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: i < step ? "100%" : "0%" }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <Card className="p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div>
                <h3 className="font-display text-2xl">Which symptoms apply?</h3>
                <p className="text-sm text-muted-foreground">Select all that describe how you feel right now.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SYMPTOM_OPTIONS.map((s) => {
                    const active = flags[s.key];
                    return (
                      <button
                        key={s.key}
                        onClick={() => setFlags({ ...flags, [s.key]: !active })}
                        className={`group relative rounded-2xl border p-4 text-left transition-all ${
                          active ? "border-primary/60 bg-primary/5 ring-4 ring-primary/10" : "border-border bg-surface-elevated hover:border-primary/30"
                        }`}
                      >
                        <IconTile icon={<s.icon size={18} />} tone={s.tone} />
                        <p className="mt-3 text-sm font-semibold">{s.label}</p>
                        {active && <Check size={14} className="absolute top-3 right-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="font-display text-2xl">How long has this been going on?</h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {DURATION_OPTIONS.map((d) => {
                    const active = durationDays === d.days;
                    return (
                      <button
                        key={d.label}
                        onClick={() => setDurationDays(d.days)}
                        className={`rounded-2xl border p-5 text-left transition-all ${
                          active ? "border-primary/60 bg-primary/5 ring-4 ring-primary/10" : "border-border bg-surface-elevated hover:border-primary/30"
                        }`}
                      >
                        <p className="font-display text-xl">{d.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          ≈ {d.days} day{d.days === 1 ? "" : "s"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="font-display text-2xl">Where do you feel it? (optional)</h3>
                <p className="text-sm text-muted-foreground">Helps the clinician find the source faster.</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {LOCATIONS.map((loc) => {
                    const active = painLocation === loc;
                    return (
                      <button
                        key={loc}
                        onClick={() => setPainLocation(active ? "" : loc)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-elevated hover:bg-muted"
                        }`}
                      >
                        {active && <Check size={12} className="mr-1.5 inline" />}
                        {loc}
                      </button>
                    );
                  })}
                </div>
                {submit.error && (
                  <p className="mt-4 rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-xs text-coral">
                    {(submit.error as Error).message}
                  </p>
                )}
              </div>
            )}

            {step === 3 && submit.data && (
              <ResultView urgency={submit.data.urgency_level} advice={submit.data.advice} onReset={reset} />
            )}
          </motion.div>
        </AnimatePresence>

        {step < 3 && (
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</p>
            <button
              onClick={() => canNext && goNext()}
              disabled={!canNext || submit.isPending}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : (step === 2 ? "Get result" : "Continue")}
              {!submit.isPending && <ChevronRight size={14} />}
            </button>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

function ResultView({ urgency, advice, onReset }: { urgency: string; advice: string; onReset: () => void }) {
  const cfg = urgency === "emergency"
    ? { title: "Seek emergency care now", tone: "coral" as const, chip: "Emergency · call responders", icon: <AlertTriangle size={22} /> }
    : urgency === "soon"
    ? { title: "See a health worker soon", tone: "amber" as const, chip: "Moderate priority", icon: <Stethoscope size={22} /> }
    : { title: "Self-care with monitoring", tone: "mint" as const, chip: "Low severity", icon: <Sparkles size={22} /> };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <IconTile icon={cfg.icon} tone={cfg.tone} size="lg" />
        <div>
          <Chip tone={cfg.tone}>{cfg.chip}</Chip>
          <h3 className="mt-1 font-display text-3xl">{cfg.title}</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/60 p-5 lg:col-span-2">
          <h4 className="font-semibold">Care advice</h4>
          <p className="text-xs text-muted-foreground">Generated by the SYM-CARE triage engine — not a diagnosis.</p>
          <p className="mt-4 text-sm leading-relaxed">{advice}</p>
          <button
            onClick={onReset}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold"
          >
            <RefreshCw size={12} /> Start a new check
          </button>
        </div>

        <div className="space-y-4">
          <Link to="/sos" className="flex items-center justify-between rounded-2xl bg-coral p-4 text-coral-foreground shadow-lg shadow-coral/25">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase">Escalate</p>
              <p className="font-display text-lg">Trigger SOS</p>
            </div>
            <Phone size={20} />
          </Link>
          <Link to="/clinics" className="flex items-center justify-between rounded-2xl border border-border bg-surface-elevated p-4">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Next step</p>
              <p className="font-display text-lg">Nearby clinics</p>
            </div>
            <MapPin size={20} className="text-primary" />
          </Link>
        </div>
      </div>
    </div>
  );
}
