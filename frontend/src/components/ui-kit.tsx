import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1.5 font-display text-3xl text-foreground sm:text-4xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Chip({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "mint" | "coral" | "amber" | "lavender";
  className?: string;
}) {
  const tones = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    mint: "bg-mint/20 text-mint-foreground",
    coral: "bg-coral/10 text-coral",
    amber: "bg-amber/20 text-amber-foreground",
    lavender: "bg-lavender/25 text-lavender-foreground",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  unit,
  trend,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  icon?: ReactNode;
  tone?: "primary" | "mint" | "coral" | "amber" | "lavender";
}) {
  const bg = {
    primary: "bg-primary/10 text-primary",
    mint: "bg-mint/20 text-mint-foreground",
    coral: "bg-coral/10 text-coral",
    amber: "bg-amber/20 text-amber-foreground",
    lavender: "bg-lavender/25 text-lavender-foreground",
  }[tone];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${bg}`}>{icon}</div>
        {trend && <Chip tone="mint">{trend}</Chip>}
      </div>
      <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1 font-display text-3xl text-foreground">
        {value}
        {unit && <span className="text-sm font-sans text-muted-foreground">{unit}</span>}
      </p>
    </motion.div>
  );
}

export function Card({
  children,
  className = "",
  ...props
}: HTMLMotionProps<"div"> & { className?: string }) {
  return (
    <motion.div className={`surface-card ${className}`} {...props}>
      {children}
    </motion.div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
    >
      {children}
    </motion.div>
  );
}

export function IconTile({
  icon,
  tone = "primary",
  size = "md",
}: {
  icon: ReactNode;
  tone?: "primary" | "mint" | "coral" | "amber" | "lavender";
  size?: "sm" | "md" | "lg";
}) {
  const bg = {
    primary: "bg-primary/10 text-primary",
    mint: "bg-mint/20 text-mint-foreground",
    coral: "bg-coral/10 text-coral",
    amber: "bg-amber/20 text-amber-foreground",
    lavender: "bg-lavender/25 text-lavender-foreground",
  }[tone];
  const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" }[size];
  return <div className={`grid ${sizes} shrink-0 place-items-center rounded-xl ${bg}`}>{icon}</div>;
}
