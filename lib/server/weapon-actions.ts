"use server";

import { revalidatePath } from "next/cache";
import { getRequestRepository } from "@/lib/server/repositories/factory";
import { getServerRepositoryContext } from "@/lib/server/request-context";

export async function createWeaponAction(formData: FormData) {
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：页面表单必须经过 Repository 写入，让 Supabase RLS 统一决定当前用户是否有写权限。
  await repository.createWeapon({
    name: readFormText(formData, "name"),
    slug: readFormText(formData, "slug"),
    enabled: formData.get("enabled") === "on",
    sortOrder: readOptionalFormNumber(formData, "sortOrder")
  });
  revalidatePath("/weapons");
}

export async function updateWeaponAction(formData: FormData) {
  const repository = await getRequestRepository(await getServerRepositoryContext());

  // 关键路径：编辑动作只提交用户可改字段，组织隔离和角色写权限由 Repository 上下文与 RLS 共同约束。
  await repository.updateWeapon({
    id: readFormText(formData, "id"),
    name: readFormText(formData, "name"),
    slug: readFormText(formData, "slug"),
    enabled: formData.get("enabled") === "on",
    sortOrder: readOptionalFormNumber(formData, "sortOrder")
  });
  revalidatePath("/weapons");
}

function readFormText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  if (typeof value !== "string") {
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
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a number`);
  }

  return numberValue;
}
