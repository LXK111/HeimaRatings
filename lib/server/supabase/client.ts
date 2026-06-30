import { createClient } from "@supabase/supabase-js";
import { createAuthSupabaseClient } from "@/lib/server/supabase/auth";

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Supabase data source is not configured. Missing: ${missing.join(", ")}`);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase data source is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

export async function createUserSupabaseClient() {
  return createAuthSupabaseClient();
}
