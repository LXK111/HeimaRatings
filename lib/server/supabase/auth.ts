import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isManagementAuthRequired() {
  return (
    process.env.HEIMA_RATINGS_DATA_SOURCE === "supabase" &&
    process.env.HEIMA_RATINGS_AUTH_REQUIRED !== "false"
  );
}

export function isSupabaseAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey());
}

export async function createAuthSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getSupabasePublicKey();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase Auth is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware can refresh tokens later.
        }
      }
    }
  });
}

export async function getCurrentAuthUser() {
  if (!isManagementAuthRequired()) {
    return undefined;
  }

  if (!isSupabaseAuthConfigured()) {
    return undefined;
  }

  const supabase = await createAuthSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return undefined;
  }

  return data.user ?? undefined;
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
