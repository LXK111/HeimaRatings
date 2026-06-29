import { redirect } from "next/navigation";
import { unauthorized } from "@/lib/server/api-response";
import {
  getCurrentAuthUser,
  isManagementAuthRequired,
  isSupabaseAuthConfigured
} from "@/lib/server/supabase/auth";

export async function requireManagementUser() {
  if (!isManagementAuthRequired()) {
    return undefined;
  }

  if (!isSupabaseAuthConfigured()) {
    redirect("/login?error=Supabase%20Auth%20is%20not%20configured");
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireManagementApiUser() {
  if (!isManagementAuthRequired()) {
    return undefined;
  }

  if (!isSupabaseAuthConfigured()) {
    return unauthorized("Supabase Auth is not configured");
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    return unauthorized();
  }

  return undefined;
}
