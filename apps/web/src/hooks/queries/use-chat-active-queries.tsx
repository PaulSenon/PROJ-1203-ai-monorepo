import { cvx } from "@/lib/convex/queries";
import { useChatNav } from "../use-chat-nav";
import { useCvxQueryCached } from "./convex/utils/use-convex-query-2-cached";

export function useActiveThreadQuery() {
  const chatNav = useChatNav();
  const isSkip = chatNav.isNew;
  return useCvxQueryCached(
    ...cvx.query.getThread({ threadUuid: chatNav.id }).options.skipWhen(isSkip)
  );
}

export function useActiveThreadMessagesQuery() {
  const chatNav = useChatNav();
  const isSkip = chatNav.isNew;
  return useCvxQueryCached(
    ...cvx.query
      .getAllThreadMessagesAsc({ threadUuid: chatNav.id })
      .options.skipWhen(isSkip)
  );
}
