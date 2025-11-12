import { cvx } from "@/lib/convex/queries";
import { useChatNav } from "../use-chat-nav";
import { useCvxQueryCached } from "./convex/utils/use-convex-query-2-cached";

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

export function useActiveThreadMessagesQuery({
  skip,
}: {
  skip?: boolean;
} = {}) {
  const chatNav = useChatNav();
  const isSkip = chatNav.isNew ?? skip ?? false;
  return useCvxQueryCached(
    ...cvx.query
      .getAllThreadMessagesAsc({ threadUuid: chatNav.id })
      .options.skipWhen(isSkip)
  );
}
