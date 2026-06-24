interface PanelProps {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, action, children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-blade backdrop-blur ${className}`}
    >
      {(title || eyebrow || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="text-xs font-black uppercase tracking-[0.32em] text-brass-400">
                {eyebrow}
              </p>
            ) : null}
            {title ? <h2 className="mt-2 text-2xl font-black text-stone-50">{title}</h2> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
