import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface ActionLinkProps {
  href: string;
  children: React.ReactNode;
}

export function ActionLink({ href, children }: ActionLinkProps) {
  return (
    <Link
      className="group inline-flex items-center gap-2 rounded-full border border-brass-500/40 bg-brass-500 px-4 py-2 text-xs font-black text-iron-950 transition hover:bg-brass-400"
      href={href}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}
