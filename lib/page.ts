import { one } from "@/lib/format";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function feedback(searchParams: SearchParams) {
  const params = await searchParams;
  return { error: one(params.error), notice: one(params.notice) };
}
