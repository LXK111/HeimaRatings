import { AppShell } from "@/components/layout/app-shell";
import { MatchWorkbench } from "@/components/matches/match-workbench";
import { ActionLink } from "@/components/ui/action-link";
import { Panel } from "@/components/ui/panel";
import type {
  PlayerSummary,
  PublicRankingPageSummary,
  TournamentEventSummary,
  WeaponType
} from "@/lib/domain/types";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

interface MatchesPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    eventId?: string;
  }>;
}

export default async function MatchesPage({ params, searchParams }: MatchesPageProps) {
  const { id } = await params;
  const initialEventId = (await searchParams)?.eventId;
  const repository = await getRequestRepository(await getServerRepositoryContext());

  let weapons: WeaponType[];
  let players: PlayerSummary[];
  let events: TournamentEventSummary[];
  let publicPages: PublicRankingPageSummary[];
  try {
    [weapons, players, events, publicPages] = await Promise.all([
      repository.listWeapons(),
      repository.listPlayers(),
      repository.listTournamentEvents(id),
      repository.listPublicRankingPages()
    ]);
  } catch (error) {
    if (isMissingCurrentOrganizationTournament(error)) {
      return <MissingTournamentPage />;
    }
    throw error;
  }

  return (
    <AppShell
      eyebrow="Match Desk"
      title="比赛录入"
      description="裁判台视角的比赛记录页面。阶段 4 接入比赛草稿提交与 Ranking Engine，形成页面临时闭环。"
    >
      <MatchWorkbench
        events={events}
        initialEventId={initialEventId}
        players={players}
        publicPages={publicPages}
        tournamentId={id}
        weapons={weapons}
      />
    </AppShell>
  );
}

function MissingTournamentPage() {
  return (
    <AppShell
      eyebrow="Match Desk"
      title="比赛录入不可用"
      description="当前组织下找不到这个赛事，可能是测试数据已清理，或旧链接仍指向其他组织的赛事。"
    >
      <Panel action={<ActionLink href="/tournaments">返回赛事列表</ActionLink>} title="未找到赛事">
        <p className="text-sm leading-7 text-stone-400">
          请从赛事列表选择当前组织里的赛事，再进入比赛项目、比赛录入或排名页面。
        </p>
      </Panel>
    </AppShell>
  );
}

function isMissingCurrentOrganizationTournament(error: unknown) {
  return error instanceof Error && error.message === "Tournament not found in current organization";
}
