"use server";

import { revalidatePath } from "next/cache";
import type { LifecycleStatus, TournamentFormat } from "@/lib/domain/types";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export async function createTournamentEventAction(formData: FormData) {
  const tournamentId = readFormText(formData, "tournamentId");
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：项目是签表和项目级排名的真实挂载点，写权限和组织隔离交给 Repository/RLS。
  await repository.createTournamentEvent(tournamentId, {
    name: readFormText(formData, "name"),
    weaponTypeId: readFormText(formData, "weaponTypeId"),
    format: readTournamentFormat(formData),
    status: readLifecycleStatus(formData)
  });
  revalidatePath(`/tournaments/${tournamentId}/events`);
}

export async function updateTournamentEventAction(formData: FormData) {
  const tournamentId = readFormText(formData, "tournamentId");
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：只维护比赛项目元数据，不生成签表、不改写比赛结果。
  await repository.updateTournamentEvent(tournamentId, {
    id: readFormText(formData, "id"),
    name: readFormText(formData, "name"),
    weaponTypeId: readFormText(formData, "weaponTypeId"),
    format: readTournamentFormat(formData),
    status: readLifecycleStatus(formData)
  });
  revalidatePath(`/tournaments/${tournamentId}/events`);
}

function readFormText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  return value;
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
