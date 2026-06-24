import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

export function StatCard({ icon: Icon, label, value, detail }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-blade backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-400">
          {label}
        </span>
        <span className="rounded-2xl border border-brass-500/30 bg-brass-500/10 p-2 text-brass-400">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <div className="text-3xl font-black tracking-tight text-stone-50">{value}</div>
      <p className="mt-2 text-sm leading-6 text-stone-400">{detail}</p>
    </article>
  );
}
