"use server";

import { revalidatePath } from "next/cache";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export async function createPlayerAction(formData: FormData) {
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：页面只解析表单，真实组织隔离和写权限交给请求级 Repository 与数据库 RLS。
  await repository.createPlayer({
    name: readFormText(formData, "name"),
    club: readOptionalFormText(formData, "club"),
    initialRating: readOptionalFormNumber(formData, "initialRating")
  });
  revalidatePath("/players");
}

export async function updatePlayerAction(formData: FormData) {
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：编辑基础资料不直接触碰积分行，避免把排名调整混入选手资料维护。
  await repository.updatePlayer({
    id: readFormText(formData, "id"),
    name: readFormText(formData, "name"),
    club: readOptionalFormText(formData, "club")
  });
  revalidatePath("/players");
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
  return typeof value === "string" ? value : undefined;
}

function readOptionalFormNumber(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a number`);
  }

  return numberValue;
}
