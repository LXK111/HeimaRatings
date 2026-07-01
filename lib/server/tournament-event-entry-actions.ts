"use server";

import { revalidatePath } from "next/cache";
import type { TournamentEventEntryStatus } from "@/lib/domain/types";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export async function createTournamentEventEntryAction(formData: FormData) {
  const tournamentId = readFormText(formData, "tournamentId");
  const eventId = readFormText(formData, "eventId");
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：报名名单是签表输入，只维护项目参赛关系，不生成对阵。
  await repository.createTournamentEventEntry(tournamentId, eventId, {
    playerId: readFormText(formData, "playerId"),
    seed: readOptionalFormNumber(formData, "seed")
  });
  revalidatePath(`/tournaments/${tournamentId}/entries`);
  revalidatePath(`/tournaments/${tournamentId}/events`);
}

export async function updateTournamentEventEntryAction(formData: FormData) {
  const tournamentId = readFormText(formData, "tournamentId");
  const eventId = readFormText(formData, "eventId");
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：退赛和种子调整只改变报名名单状态，不删除历史关系。
  await repository.updateTournamentEventEntry(tournamentId, eventId, {
    id: readFormText(formData, "id"),
    seed: readOptionalFormNumber(formData, "seed"),
    status: readEntryStatus(formData)
  });
  revalidatePath(`/tournaments/${tournamentId}/entries`);
  revalidatePath(`/tournaments/${tournamentId}/events`);
}

function readFormText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

function readOptionalFormNumber(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return numberValue;
}

function readEntryStatus(formData: FormData): TournamentEventEntryStatus {
  const value = readFormText(formData, "status");
  if (["registered", "withdrawn"].includes(value)) {
    return value as TournamentEventEntryStatus;
  }

  throw new Error("entry status is invalid");
}
