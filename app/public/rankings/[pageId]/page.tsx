import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { RankingBoard } from "@/components/rankings/ranking-board";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicPageTheme, PublicRankingPagePayload, WeaponType } from "@/lib/domain/types";
import { getRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

interface PublicRankingPageProps {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ height?: string; theme?: string; weapon?: string }>;
}

export async function generateMetadata({ params }: Pick<PublicRankingPageProps, "params">): Promise<Metadata> {
  const { pageId } = await params;
  const repository = getRepository(await getServerRepositoryContext({ authorize: false }));
  const page = await repository.getPublicRankingPage(pageId);
  if (!page || !page.enabled) {
    return {
      title: "公开榜单不可用 | HEMA Ratings",
      description: "该 HEMA Ratings 公开榜单不存在或已关闭。"
    };
  }

  const description = `${page.title} 的 HEMA 组织长期总榜，支持按武器查看最新发布快照。`;
  return {
    title: `${page.title} | HEMA Ratings`,
    description,
    openGraph: {
      title: `${page.title} | HEMA Ratings`,
      description,
      type: "website"
    }
  };
}

export default async function PublicRankingPage({ params, searchParams }: PublicRankingPageProps) {
  const { pageId } = await params;
  const query = await searchParams;
  const repository = getRepository(await getServerRepositoryContext({ authorize: false }));
  const page = await repository.getPublicRankingPage(pageId);

  if (!page || !page.enabled) {
    return (
      <AppShell
        eyebrow="Public Ranking"
        showOrganizationSwitcher={false}
        title="公开榜单不可用"
        description="该榜单不存在或已关闭。"
      >
        <Panel title="榜单不可用">
          <p className="text-sm text-stone-400">
            请检查公开链接是否正确，或联系赛事管理员重新发布榜单。
          </p>
        </Panel>
      </AppShell>
    );
  }

  const selectedWeapon = resolveWeapon(page, query.weapon);
  const embedTheme = resolveTheme(query.theme, page.theme);
  const embedHeight = resolveEmbedHeight(query.height);
  const rows = page.rankingsByWeapon[selectedWeapon.id] ?? [];
  const selectedEmbedUrl = buildEmbedUrl(page.embedUrl, {
    height: embedHeight,
    theme: embedTheme,
    weapon: selectedWeapon.id
  });
  const selectedIframeCode = buildIframeCode({
    height: embedHeight,
    src: selectedEmbedUrl,
    title: `${page.title} - ${selectedWeapon.name}`
  });

  return (
    <AppShell
      eyebrow="Public Ranking"
      showOrganizationSwitcher={false}
      title={page.title}
      description="公开页面面向外部访问者，只读展示当前组织按武器汇总的长期排名结果，并提供 iframe 嵌入代码。"
    >
      <section className="grid gap-5 lg:grid-cols-4">
        <Panel title="发布状态">
          <StatusBadge label="已发布" tone="green" />
          <p className="mt-4 text-sm text-stone-400">当前公开链接可访问，适合分享给外部观众。</p>
        </Panel>
        <Panel title="默认武器">
          <p className="text-3xl font-black text-stone-50">{selectedWeapon.name}</p>
          <p className="mt-4 text-sm text-stone-400">支持通过页面内切换查看不同武器积分池。</p>
        </Panel>
        <Panel title="算法">
          <p className="text-3xl font-black uppercase text-brass-400">{page.algorithm}</p>
          <p className="mt-4 text-sm text-stone-400">当前公开榜单使用组织级快照展示语义。</p>
        </Panel>
        <Panel title="生成时间">
          <p className="text-lg font-black text-stone-50">{page.generatedAt ?? "未知"}</p>
          <p className="mt-4 text-sm text-stone-400">发布后固定展示本次组织总榜快照。</p>
        </Panel>
      </section>

      <Panel className="mt-6" title="武器切换">
        <div className="flex flex-wrap gap-3">
          {page.weapons.map((weapon) => (
            <Link
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                weapon.id === selectedWeapon.id
                  ? "border-brass-500 bg-brass-500 text-iron-950"
                  : "border-white/10 bg-white/[0.04] text-stone-300 hover:border-brass-500/50"
              }`}
              href={`/public/rankings/${page.pageId}?weapon=${weapon.id}`}
              key={weapon.id}
            >
              {weapon.name}
            </Link>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6" title="嵌入配置">
        <div className="flex flex-wrap gap-3">
          {(["dark", "light", "compact"] as const).map((theme) => (
            <Link
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                theme === embedTheme
                  ? "border-brass-500 bg-brass-500 text-iron-950"
                  : "border-white/10 bg-white/[0.04] text-stone-300 hover:border-brass-500/50"
              }`}
              href={`/public/rankings/${page.pageId}?weapon=${selectedWeapon.id}&theme=${theme}&height=${embedHeight}`}
              key={theme}
            >
              {theme}
            </Link>
          ))}
          {[480, 640, 800].map((height) => (
            <Link
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                height === embedHeight
                  ? "border-piste-500 bg-piste-500 text-iron-950"
                  : "border-white/10 bg-white/[0.04] text-stone-300 hover:border-piste-500/50"
              }`}
              href={`/public/rankings/${page.pageId}?weapon=${selectedWeapon.id}&theme=${embedTheme}&height=${height}`}
              key={height}
            >
              {height}px
            </Link>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6">
        {rows.length > 0 ? (
          <RankingBoard weapon={selectedWeapon} rows={rows} />
        ) : (
          <EmptyRanking weapon={selectedWeapon} />
        )}
      </Panel>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Share" title="公开链接">
          <p className="break-all rounded-2xl border border-white/10 bg-iron-950/60 p-4 text-sm font-semibold text-stone-200">
            {page.publicUrl}
          </p>
          <p className="mt-4 text-sm text-stone-400">可直接分享给外部访问者。</p>
        </Panel>
        <Panel eyebrow="Embed" title="iframe 嵌入代码">
          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-iron-950/60 p-4 text-xs font-semibold text-brass-100">
            <code>{selectedIframeCode}</code>
          </pre>
          <p className="mt-4 break-all text-sm text-stone-400">嵌入地址：{selectedEmbedUrl}</p>
        </Panel>
      </section>
    </AppShell>
  );
}

function resolveWeapon(page: PublicRankingPagePayload, weaponId?: string): WeaponType {
  return (
    page.weapons.find((weapon) => weapon.id === weaponId) ??
    page.weapons.find((weapon) => weapon.id === page.defaultWeaponTypeId) ??
    page.weapons[0]
  );
}

function resolveTheme(theme: string | undefined, fallback: PublicPageTheme): PublicPageTheme {
  if (theme === "dark" || theme === "light" || theme === "compact") {
    return theme;
  }

  return fallback;
}

function resolveEmbedHeight(height: string | undefined) {
  const parsed = Number(height);
  if ([480, 640, 800].includes(parsed)) {
    return parsed;
  }

  return 640;
}

function buildEmbedUrl(baseUrl: string, options: { height: number; theme: PublicPageTheme; weapon: string }) {
  const params = new URLSearchParams({
    weapon: options.weapon,
    theme: options.theme,
    height: String(options.height)
  });

  return `${baseUrl}?${params.toString()}`;
}

function buildIframeCode({ height, src, title }: { height: number; src: string; title: string }) {
  return `<iframe src="${src}" title="${title}" width="100%" height="${height}" style="border:0;border-radius:16px;"></iframe>`;
}

function EmptyRanking({ weapon }: { weapon: WeaponType }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 p-6 text-sm text-stone-400">
      {weapon.name} 暂无公开排名数据。
    </div>
  );
}
