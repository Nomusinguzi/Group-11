import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MapPin,
  Stethoscope,
  Siren,
  FileText,
  CalendarDays,
  Bell,
  Search,
  LogOut,
  Check,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSearch } from "@/lib/search-context";
import { useNotifications, useMarkNotificationRead } from "@/lib/queries";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  tone?: "coral";
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clinics", label: "Clinics", icon: MapPin },
  { to: "/symptoms", label: "Symptoms", icon: Stethoscope },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/records", label: "Records", icon: FileText },
  { to: "/sos", label: "SOS", icon: Siren, tone: "coral" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-3 px-6 pt-7 pb-8">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? item.tone === "coral"
                      ? "bg-coral/10 text-coral"
                      : "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className={`absolute inset-y-1 left-0 w-1 rounded-full ${
                      item.tone === "coral" ? "bg-coral" : "bg-primary"
                    }`}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="h-4.5 w-4.5" size={18} />
                <span>{item.label}</span>
                {item.tone === "coral" && (
                  <span className="ml-auto flex h-2 w-2 items-center justify-center">
                    <span className="absolute h-2 w-2 animate-ping rounded-full bg-coral/60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-coral" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-mint text-sm font-semibold text-primary-foreground">
              {user ? initials(user.full_name) : "··"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.full_name ?? "Signed in"}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{user?.role ?? "patient"}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        <TopBar onLogout={handleLogout} />
        <main className="pb-28 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav pathname={pathname} />
    </div>
  );
}

function TopBar({ onLogout }: { onLogout: () => void }) {
  const { query, setQuery } = useSearch();
  const { data: notifications } = useNotifications();
  const [openBell, setOpenBell] = useState(false);
  const markRead = useMarkNotificationRead();

  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
        <div className="lg:hidden">
          <Logo compact />
        </div>
        <div className="ml-auto flex flex-1 items-center gap-3 lg:ml-0">
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctors, clinics, records…"
              className="h-10 w-full rounded-full border border-border bg-background/60 pr-4 pl-10 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenBell((v) => !v)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground hover:text-foreground"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-coral ring-2 ring-background" />
              )}
            </button>
            {openBell && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className="text-[11px] text-muted-foreground">{unread} unread</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {(notifications ?? []).length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                      You're all caught up.
                    </div>
                  ) : (
                    (notifications ?? []).slice(0, 15).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => !n.read_at && markRead.mutate(n.id)}
                        className={`flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left hover:bg-muted/50 ${
                          n.read_at ? "opacity-70" : ""
                        }`}
                      >
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-muted" : "bg-primary"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {n.read_at && <Check size={14} className="text-muted-foreground" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/sos"
            className="hidden items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-semibold text-coral-foreground shadow-lg shadow-coral/30 transition-transform hover:scale-[1.02] sm:inline-flex"
          >
            <Siren size={16} />
            Emergency
          </Link>
          <button
            onClick={onLogout}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const items = nav.slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto flex max-w-md justify-around gap-1 rounded-full border border-border bg-surface-elevated/90 p-1.5 shadow-2xl shadow-primary/10 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[10px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="mobile-active"
                className="absolute inset-0 rounded-full bg-primary/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon size={18} className="relative" />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary to-mint text-primary-foreground shadow-lg shadow-primary/25">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z" />
        </svg>
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-mint ring-2 ring-surface" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">
            SYM<span className="text-primary">·</span>CARE
          </p>
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">Connected care</p>
        </div>
      )}
      {compact && (
        <p className="text-[15px] font-bold tracking-tight">
          SYM<span className="text-primary">·</span>CARE
        </p>
      )}
    </Link>
  );
}
