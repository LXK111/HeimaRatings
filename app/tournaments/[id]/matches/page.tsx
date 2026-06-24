import { AppShell } from "@/components/layout/app-shell";
import { MatchWorkbench } from "@/components/matches/match-workbench";

interface MatchesPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { id } = await params;

  return (
    <AppShell
      eyebrow="Match Desk"
      title="比赛录入"
      description="裁判台视角的比赛记录页面。阶段 4 接入比赛草稿提交与 Ranking Engine，形成页面临时闭环。"
    >
      <MatchWorkbench tournamentId={id} />
    </AppShell>
  );
}
