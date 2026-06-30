"use server";

import { revalidatePath } from "next/cache";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export async function generateTournamentEventBracketAction(formData: FormData) {
  const tournamentId = readFormText(formData, "tournamentId");
  const eventId = readFormText(formData, "eventId");
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：生成签表只创建 matches 草稿，不覆盖已有比赛，不处理晋级。
  await repository.generateTournamentEventBracket(tournamentId, eventId);
  revalidatePath(`/tournaments/${tournamentId}/events`);
  revalidatePath(`/tournaments/${tournamentId}/matches`);
}

function readFormText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}
