import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: { message } }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: { message } }, { status: 404 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: { message } }, { status: 500 });
}

export async function withServerError(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return serverError(error);
  }
}
