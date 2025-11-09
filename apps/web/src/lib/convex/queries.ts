import { api } from "@ai-monorepo/convex/convex/_generated/api";
import type { Doc, Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { insertAtTop, useMutation } from "convex/react";
import { paginatedQueryBuilder, queryBuilder } from "./helpers";

/**
 * This is where to define all query options to use across the app.
 * So we cannot misconfigure an optimistic update.
 */

const convexQueries = {
  threadHistoryPaginated: paginatedQueryBuilder(
    api.chat.getThreadsForListing,
    {},
    {
      initialNumItems: 50,
    }
  ),
  getChatPreferences: queryBuilder(api.users.getUserChatPreferences),
  // TODO: high order
  // getThread: queryBuilder(api.chat.getThread, { threadUuid:  }),
  // const thread = useQuery(
  //   api.chat.getThread,
  //   isSkip ? "skip" : { threadUuid: chatNav.id }
  // );
} as const;

const convexMutations = {
  // TODO: finish this user prefs thingy
  upsertChatPreferences: () =>
    useMutation(api.users.upsertUserChatPreferences).withOptimisticUpdate(
      (localStore, mutationArgs) => {
        const query = convexQueries.getChatPreferences.query;
        const args = convexQueries.getChatPreferences.args;
        const value = localStore.getQuery(query, ...args);
        localStore.setQuery(query, args, {
          // if new
          _id: crypto.randomUUID() as Id<"userChatPreferences">,
          _creationTime: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: crypto.randomUUID() as Id<"users">,
          // if existing
          ...value,
          // optimistic patch
          preferredModelId: mutationArgs?.patch?.preferredModelId,
        });
      }
    ),
  upsertThread: () =>
    useMutation(api.chat.upsertThread).withOptimisticUpdate(
      (localStore, mutationArgs) => {
        const query = convexQueries.threadHistoryPaginated.query;
        const args = convexQueries.threadHistoryPaginated.args;

        // we get and filter out the thread if already exist
        const allPages = localStore.getAllQueries(query);
        let thread: Doc<"threads"> | undefined;
        for (const { value, args: _args } of allPages) {
          if (!value) continue;
          for (const item of value.page) {
            if (item.uuid === mutationArgs.threadUuid) {
              // Replace with your match condition
              thread = item;
              localStore.setQuery(query, _args, {
                ...value,
                page: value.page.filter(
                  (i) => i.uuid !== mutationArgs.threadUuid
                ),
              });
              break;
            }
          }
          if (thread) break; // Stop as soon as you find a match
        }

        // we insert at top, either the same thread patched, ot a new one
        insertAtTop({
          paginatedQuery: query,
          argsToMatch: args, // same args as in the sidebar
          localQueryStore: localStore,
          item: {
            _id: thread?._id ?? (crypto.randomUUID() as Id<"threads">),
            _creationTime: thread?._creationTime ?? Date.now(),
            userId: thread?.userId ?? (crypto.randomUUID() as Id<"users">),
            uuid: mutationArgs.threadUuid,
            createdAt: thread?.createdAt ?? Date.now(),
            updatedAt: Date.now(),
            lifecycleState: thread?.lifecycleState ?? "active",
            liveStatus:
              mutationArgs.patch.liveStatus ??
              thread?.liveStatus ??
              "completed",
            title: mutationArgs.patch.title ?? thread?.title,
            lastUsedModelId:
              mutationArgs.patch.lastUsedModelId ?? thread?.lastUsedModelId,
            deletedAt: thread?.deletedAt,
          },
        });
      }
    ),
} as const;

export const cvx = {
  query: convexQueries,
  mutations: convexMutations,
};
