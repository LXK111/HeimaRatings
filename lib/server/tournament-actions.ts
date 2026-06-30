"use server";

import { revalidatePath } from "next/cache";
import type { LifecycleStatus, RankingAlgorithm, TournamentFormat } from "@/lib/domain/types";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export async function createTournamentAction(formData: FormData) {
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：赛事是比赛项目和签表的容器，页面动作只解析表单，写权限交给 Repository/RLS。
  await repository.createTournament({
    name: readFormText(formData, "name"),
    format: readTournamentFormat(formData),
    status: readLifecycleStatus(formData),
    defaultAlgorithm: readRankingAlgorithm(formData),
    startedAt: readOptionalFormText(formData, "startedAt"),
    endedAt: readOptionalFormText(formData, "endedAt")
  });
  revalidatePath("/tournaments");
}

export async function updateTournamentAction(formData: FormData) {
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：这里只维护赛事容器元数据，不创建比赛项目，不触发排名重算。
  await repository.updateTournament({
    id: readFormText(formData, "id"),
    name: readFormText(formData, "name"),
    format: readTournamentFormat(formData),
    status: readLifecycleStatus(formData),
    defaultAlgorithm: readRankingAlgorithm(formData),
    startedAt: readOptionalFormText(formData, "startedAt"),
    endedAt: readOptionalFormText(formData, "endedAt")
  });
  revalidatePath("/tournaments");
}

function readFormText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

function readOptionalFormText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readTournamentFormat(formData: FormData): TournamentFormat {
  const value = readFormText(formData, "format");
  if (["single_elimination", "round_robin", "swiss", "custom"].includes(value)) {
    return value as TournamentFormat;
  }

  throw new Error("format is invalid");
}

function readLifecycleStatus(formData: FormData): LifecycleStatus {
  const value = readFormText(formData, "status");
  if (["draft", "active", "completed"].includes(value)) {
    return value as LifecycleStatus;
  }

  throw new Error("status is invalid");
}

function readRankingAlgorithm(formData: FormData): RankingAlgorithm {
  const value = readFormText(formData, "defaultAlgorithm");
  if (["elo", "sdr", "glicko2", "hybrid"].includes(value)) {
    return value as RankingAlgorithm;
  }

  throw new Error("defaultAlgorithm is invalid");
}
