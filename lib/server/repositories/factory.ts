import { MockRepository } from "@/lib/server/repositories/mock";
import { SupabaseRepository } from "@/lib/server/repositories/supabase";
import { repositoryContextCacheKey } from "@/lib/server/repositories/context";
import { createUserSupabaseClient } from "@/lib/server/supabase/client";
import { isManagementAuthRequired } from "@/lib/server/supabase/auth";
import type { AppRepository } from "@/lib/server/repositories/types";
import type { RepositoryContext } from "@/lib/server/repositories/context";

type DataSource = "mock" | "supabase";

let repository: AppRepository | undefined;
let repositorySource: DataSource | undefined;
const supabaseRepositories = new Map<string, AppRepository>();

export function getRepository(context: RepositoryContext = {}): AppRepository {
  const source = readDataSource();
  if (source === "supabase") {
    const key = repositoryContextCacheKey(context);
    const cached = supabaseRepositories.get(key);
    if (cached) {
      return cached;
    }

    const nextRepository = new SupabaseRepository(context);
    supabaseRepositories.set(key, nextRepository);
    return nextRepository;
  }

  if (!repository || repositorySource !== source) {
    repository = createRepository(source);
    repositorySource = source;
  }

  return repository;
}

export async function getRequestRepository(context: RepositoryContext = {}): Promise<AppRepository> {
  const source = readDataSource();
  if (source !== "supabase" || !isManagementAuthRequired()) {
    return getRepository(context);
  }

  return new SupabaseRepository(context, createUserSupabaseClient);
}

function readDataSource(): DataSource {
  const source = process.env.HEIMA_RATINGS_DATA_SOURCE ?? "mock";
  if (source === "mock" || source === "supabase") {
    return source;
  }

  throw new Error(`Unsupported HEIMA_RATINGS_DATA_SOURCE: ${source}`);
}

function createRepository(source: DataSource): AppRepository {
  if (source === "supabase") {
    return new SupabaseRepository();
  }

  return new MockRepository();
}
