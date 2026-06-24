import { RankingBoard } from "@/components/rankings/ranking-board";
import { rankingsByWeapon, weaponTypes } from "@/lib/mock/dashboard-data";

export default function EmbedRankingPage() {
  const weapon = weaponTypes[0];

  return (
    <main className="min-h-screen bg-iron-950 p-4 text-stone-50">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.32em] text-brass-400">
          HEMA Ratings Embed
        </p>
        <RankingBoard compact weapon={weapon} rows={rankingsByWeapon[weapon.id] ?? []} />
      </section>
    </main>
  );
}
