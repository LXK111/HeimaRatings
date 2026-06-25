import { MockRepository } from "@/lib/server/repositories/mock";
import { SupabaseRepository } from "@/lib/server/repositories/supabase";
import type { AppRepository } from "@/lib/server/repositories/types";

type DataSource = "mock" | "supabase";

let repository: AppRepository | undefined;
let repositorySource: DataSource | undefined;

export function getRepository(): AppRepository {
  const source = readDataSource();
  if (!repository || repositorySource !== source) {
    repository = createRepository(source);
    repositorySource = source;
  }

  return repository;
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
