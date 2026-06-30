import { Swords, Target, Trophy, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/layout/stat-card";
import { ActionLink } from "@/components/ui/action-link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

const nextSteps = [
  "阶段 1：落地 Supabase 数据模型，加入 weapon_types 与 player_weapon_ratings",
  "阶段 2：扩展 Web UI 页面，支持武器类型、赛事项目和排名切换",
  "阶段 3：接入 API 与 Ranking Engine，调用四种 Python 算法"
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [weaponTypes, players, tournaments, publicPage] = await Promise.all([
    repository.listWeapons(),
    repository.listPlayers(),
    repository.listTournaments(),
    repository.getPublicRankingPage("demo")
  ]);
  const enabledWeapons = weaponTypes.filter((weapon) => weapon.enabled);
  const activeTournament = tournaments.find((item) => item.status === "active");
  const rankingSnapshots = enabledWeapons
    .map((weapon) => {
      const leader = publicPage?.rankingsByWeapon[weapon.id]?.[0];
      if (!leader) {
        return undefined;
      }
      return {
        id: `${publicPage?.pageId}-${weapon.id}`,
        weaponTypeId: weapon.id,
        algorithm: publicPage?.algorithm ?? "hybrid",
        generatedAt: publicPage?.generatedAt ?? "未知",
        leaderName: leader.name,
        leaderRating: leader.rating
      };
    })
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

  return (
    <AppShell
      eyebrow="分武器积分控制台"
      title="HEMA Ratings"
      description="管理端控制台通过 Repository 数据源呈现武器类型、选手、赛事和已发布排名快照。"
    >
      <section className="grid gap-4 py-8 md:grid-cols-4">
        <StatCard
          icon={Swords}
          label="武器类型"
          value={`${enabledWeapons.length}`}
          detail="长剑、军刀、迅捷剑已启用，匕首暂未启用。"
        />
        <StatCard
          icon={UsersRound}
          label="选手"
          value={`${players.length}`}
          detail="展示分武器积分摘要。"
        />
        <StatCard
          icon={Trophy}
          label="赛事"
          value={`${tournaments.length}`}
          detail={activeTournament ? `${activeTournament.name} 正在进行` : "暂无进行中赛事"}
        />
        <StatCard
          icon={Target}
          label="排名快照"
          value={`${rankingSnapshots.length}`}
          detail="来自当前公开页已发布榜单。"
        />
      </section>

      <section className="grid gap-6 pb-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          action={<ActionLink href="/weapons">管理武器</ActionLink>}
          className="bg-iron-900/70"
          eyebrow="Weapon Pools"
          title="武器类型积分池"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {weaponTypes.map((weapon) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                key={weapon.id}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-50">{weapon.name}</h3>
                  <StatusBadge
                    label={weapon.enabled ? "启用" : "未启用"}
                    tone={weapon.enabled ? "green" : "muted"}
                  />
                </div>
                <p className="mt-3 text-sm text-stone-400">
                  slug: <span className="font-mono text-stone-200">{weapon.slug}</span>
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          action={<StatusBadge label="Repository" tone="green" />}
          eyebrow="Roadmap"
          title="下一步执行"
        >
          <ol className="mt-6 space-y-4">
            {nextSteps.map((step, index) => (
              <li className="flex gap-4" key={step}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-500 text-sm font-black text-iron-950">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-6 text-stone-300">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="选手分武器积分摘要">
          <div className="mt-5 space-y-3">
            {players.map((player) => (
              <div
                className="rounded-2xl border border-white/10 bg-iron-950/45 p-4"
                key={player.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-stone-50">{player.name}</h3>
                    <p className="text-sm text-stone-400">{player.club}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {player.weaponRatings.map((rating) => {
                      const weapon = weaponTypes.find(
                        (item) => item.id === rating.weaponTypeId
                      );
                      return (
                        <span
                          className="rounded-full border border-brass-500/30 bg-brass-500/10 px-3 py-1 text-xs font-semibold text-brass-400"
                          key={`${player.id}-${rating.weaponTypeId}`}
                        >
                          {weapon?.name ?? "未知"} #{rating.rank} · {rating.rating}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="最近排名快照">
          <div className="mt-5 space-y-3">
            {rankingSnapshots.map((snapshot) => {
              const weapon = weaponTypes.find(
                (item) => item.id === snapshot.weaponTypeId
              );
              return (
                <div
                  className="rounded-2xl border border-white/10 bg-iron-950/45 p-4"
                  key={snapshot.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-stone-400">{weapon?.name ?? "未知武器"}</p>
                      <h3 className="mt-1 font-bold text-stone-50">
                        {snapshot.leaderName} · {snapshot.leaderRating}
                      </h3>
                    </div>
                    <StatusBadge label={snapshot.algorithm.toUpperCase()} tone="brass" />
                  </div>
                  <p className="mt-3 text-xs text-stone-500">{snapshot.generatedAt}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
