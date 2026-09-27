import { cvx } from "@/lib/convex/queries";
import { useCvxQueryCached } from "./convex/utils/use-convex-query-2-cached";

export function useThread(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";
  return useCvxQueryCached(
    ...cvx.query.getThread({ threadUuid }).options.skipWhen(isSkip)
  );
}
