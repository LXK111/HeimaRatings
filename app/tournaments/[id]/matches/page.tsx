import { AppShell } from "@/components/layout/app-shell";
import { MatchWorkbench } from "@/components/matches/match-workbench";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface MatchesPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { id } = await params;
  const repository = await getRequestRepository(await getServerRepositoryContext());
  const [weapons, players, events, publicPages] = await Promise.all([
    repository.listWeapons(),
    repository.listPlayers(),
    repository.listTournamentEvents(id),
    repository.listPublicRankingPages()
  ]);

  return (
    <AppShell
      eyebrow="Match Desk"
      title="比赛录入"
      description="裁判台视角的比赛记录页面。阶段 4 接入比赛草稿提交与 Ranking Engine，形成页面临时闭环。"
    >
      <MatchWorkbench
        events={events}
        players={players}
        publicPages={publicPages}
        tournamentId={id}
        weapons={weapons}
      />
    </AppShell>
  );
}
