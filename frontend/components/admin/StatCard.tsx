import { LucideIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function StatCard({
  label,
  value,
  icon: Icon,
  accentColor = "accent",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accentColor?: "accent" | "accent2";
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-5">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          accentColor === "accent" ? "bg-accent/10 text-accent" : "bg-accent2/10 text-accent2"
        )}
      >
        <Icon size={16} />
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 font-body text-xs text-muted">{label}</p>
    </div>
  );
}