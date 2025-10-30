import z from "zod";

export function hasStatus(
  something: unknown
): something is { data: { httpStatus: number } } {
  return z
    .object({
      data: z.object({
        httpStatus: z.number(),
      }),
    })
    .safeParse(something).success;
}
export const isNetworkError = (e: unknown) =>
  hasStatus(e) && e.data.httpStatus === 0;
export const is5xx = (e: unknown) =>
  (hasStatus(e) && e.data.httpStatus?.toString().startsWith("5")) ?? false;
export const is4xx = (e: unknown) =>
  (hasStatus(e) && e.data.httpStatus?.toString().startsWith("4")) ?? false;
