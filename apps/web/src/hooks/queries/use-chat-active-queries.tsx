import { cvx } from "@/lib/convex/queries";
import { useChatNav } from "../use-chat-nav";
import { useCvxQueryCached } from "./convex/utils/use-convex-query-2-cached";

export function useThread(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";
  return useCvxQueryCached(
    ...cvx.query.getThread({ threadUuid }).options.skipWhen(isSkip)
  );
}
// TODO change for useThread
export function useActiveThreadQuery({ skip }: { skip?: boolean } = {}) {
  const chatNav = useChatNav();
  const isSkip = chatNav.isNew ?? skip ?? false;
  return useCvxQueryCached(
    ...cvx.query.getThread({ threadUuid: chatNav.id }).options.skipWhen(isSkip)
  );
}

export function useActiveThreadMutation() {
  return cvx.mutations.upsertThread();
}
