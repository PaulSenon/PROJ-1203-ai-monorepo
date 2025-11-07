import { api } from "@ai-monorepo/convex/convex/_generated/api";
import type { Doc, Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { insertAtTop, useMutation } from "convex/react";
import { paginatedQueryBuilder } from "./helpers";

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
} as const;

const convexMutations = {
  upsertThread: (_params?: { tempTitle?: string; selectedModelId?: string }) =>
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
            createdAt: Date.now(),
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
