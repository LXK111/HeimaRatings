"use server";

import { redirect } from "next/navigation";
import { createAuthSupabaseClient } from "@/lib/server/supabase/auth";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = readSafeNextPath(formData.get("next"));

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("请输入邮箱和密码")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createAuthSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createAuthSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function readSafeNextPath(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/";
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}
