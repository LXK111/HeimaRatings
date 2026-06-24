interface StatusBadgeProps {
  label: string;
  tone?: "brass" | "green" | "muted";
}

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  brass: "border-brass-500/50 bg-brass-500/15 text-brass-400",
  green: "border-piste-500/50 bg-piste-500/15 text-piste-500",
  muted: "border-white/15 bg-white/10 text-stone-300"
};

export function StatusBadge({ label, tone = "muted" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
