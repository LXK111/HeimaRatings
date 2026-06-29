import { ShieldCheck } from "lucide-react";
import { signInWithPassword } from "@/lib/server/auth-actions";
import { isManagementAuthRequired, isSupabaseAuthConfigured } from "@/lib/server/supabase/auth";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const authRequired = isManagementAuthRequired();
  const authConfigured = isSupabaseAuthConfigured();
  const next = readSafeNextPath(query.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-iron-950 px-5 py-10 text-stone-50">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-blade">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brass-500/15 text-brass-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-brass-400">
              HEMA Ratings
            </p>
            <h1 className="text-2xl font-black">管理端登录</h1>
          </div>
        </div>

        {!authRequired ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-stone-300">
            当前环境未启用管理端登录保护。
          </div>
        ) : null}

        {authRequired && !authConfigured ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            Supabase Auth 未配置。请设置 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 或
            `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
          </div>
        ) : null}

        {query.error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {query.error}
          </div>
        ) : null}

        <form action={signInWithPassword} className="mt-6 space-y-4">
          <input name="next" type="hidden" value={next} />
          <label className="block">
            <span className="text-sm font-bold text-stone-300">邮箱</span>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-iron-900 px-4 py-3 text-sm text-stone-50 outline-none transition focus:border-brass-500"
              name="email"
              placeholder="you@example.com"
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-stone-300">密码</span>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-iron-900 px-4 py-3 text-sm text-stone-50 outline-none transition focus:border-brass-500"
              name="password"
              placeholder="请输入密码"
              type="password"
            />
          </label>
          <button
            className="w-full rounded-2xl border border-brass-500/40 bg-brass-500/15 px-4 py-3 text-sm font-black text-brass-200 transition hover:bg-brass-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={authRequired && !authConfigured}
            type="submit"
          >
            登录
          </button>
        </form>
      </section>
    </main>
  );
}

function readSafeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
