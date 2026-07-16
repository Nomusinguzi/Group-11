import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Sparkles, Fingerprint, HeartPulse, Activity, Stethoscope, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && isAuthenticated) navigate({ to: "/", replace: true });
  }, [ready, isAuthenticated, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone || !password || (mode === "signup" && !fullName)) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signin") await login(phone, password);
      else await register({ phone, password, full_name: fullName });
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 gradient-hero" />
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-mint/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-lavender/40 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />

          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">Connected care</p>
            <h1 className="mt-3 font-display text-6xl leading-[1.02] text-foreground">
              Healthcare
              <br />
              that feels
              <br />
              <span className="text-gradient-primary">personal.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm text-muted-foreground">
              SYM-CARE brings clinics, doctors, prescriptions and emergency response into one calm, secure experience — designed for you and your family.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: <HeartPulse size={16} />, label: "24/7 monitoring", tone: "coral" },
                { icon: <Stethoscope size={16} />, label: "AI triage", tone: "primary" },
                { icon: <Activity size={16} />, label: "Live vitals", tone: "mint" },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl border border-border/60 bg-surface-elevated/70 p-3 backdrop-blur">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${
                    f.tone === "coral" ? "bg-coral/10 text-coral" : f.tone === "mint" ? "bg-mint/20 text-mint-foreground" : "bg-primary/10 text-primary"
                  }`}>{f.icon}</div>
                  <p className="mt-2 text-xs font-semibold">{f.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-primary" />
            HIPAA-aligned encryption · ISO 27001
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8"><Logo /></div>

          <div className="flex gap-1 rounded-full border border-border bg-background p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === m ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === m && (
                  <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative">{m === "signin" ? "Sign in" : "Create account"}</span>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-4xl">{mode === "signin" ? "Welcome back." : "Let's get you set up."}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin" ? "Your care team is waiting." : "It only takes a minute. Your data stays yours."}
            </p>
          </div>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  type="text" placeholder="Amina Kone" className="input-field"
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name" required
                />
              </Field>
            )}
            <Field label="Phone number">
              <input
                type="tel" placeholder="+256700000000" className="input-field"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel" required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6} required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {mode === "signin" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" defaultChecked /> Remember me
                </label>
                <a className="font-semibold text-primary hover:opacity-80" href="#">Forgot password?</a>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-xs font-medium text-coral">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <>
                {mode === "signin" ? "Sign in securely" : "Create my account"}
                <ArrowRight size={16} />
              </>}
            </button>

            <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated text-sm font-semibold opacity-60">
                <Fingerprint size={16} className="text-primary" /> Face / Touch ID
              </button>
              <button type="button" disabled className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated text-sm font-semibold opacity-60">
                <Sparkles size={16} className="text-primary" /> Magic link
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you accept our <a className="underline">Terms</a> and <a className="underline">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>

      <style>{`
        .input-field {
          height: 3rem;
          width: 100%;
          border-radius: 9999px;
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          padding-left: 1.25rem;
          padding-right: 1.25rem;
          font-size: 0.875rem;
          outline: none;
          transition: box-shadow .15s, border-color .15s;
        }
        .input-field:focus { border-color: color-mix(in oklab, var(--primary) 40%, transparent); box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 12%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
