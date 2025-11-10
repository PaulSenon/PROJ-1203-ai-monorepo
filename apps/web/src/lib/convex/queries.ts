import { api } from "@ai-monorepo/convex/convex/_generated/api";
import type { Doc, Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { insertAtTop } from "convex/react";
import { useCvxMutationAuth } from "@/hooks/queries/convex/utils/use-convex-mutation-0-auth";
import { paginatedQueryBuilder, queryBuilder } from "./helpers";

/**
 * This is where to define all query options to use across the app.
 * So we cannot misconfigure an optimistic update.
 */

const convexQueries = {
  threadHistoryPaginated: paginatedQueryBuilder(api.chat.getThreadsForListing, {
    initialNumItems: 50,
  }),
  getChatPreferences: queryBuilder(api.users.getUserChatPreferences),
  getThread: queryBuilder(api.chat.getThread),
  getAllThreadMessagesAsc: queryBuilder(api.chat.getAllThreadMessagesAsc),
  getCurrentUser: queryBuilder(api.users.getCurrentUser),
} as const;

const convexMutations = {
  upsertChatPreferences: () =>
    useCvxMutationAuth(
      api.users.upsertUserChatPreferences
    ).withOptimisticUpdate((localStore, mutationArgs) => {
      const chatPreferencesQuery = convexQueries.getChatPreferences();
      const value = localStore.getQuery(
        chatPreferencesQuery.query,
        ...chatPreferencesQuery.args
      );
      localStore.setQuery(
        chatPreferencesQuery.query,
        { ...chatPreferencesQuery.args },
        {
          // if new
          _creationTime: Date.now(),
          _id: crypto.randomUUID() as Id<"userChatPreferences">,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: crypto.randomUUID() as Id<"users">,
          // if existing
          ...value,
          // optimistic patch
          preferredModelId: mutationArgs?.patch?.preferredModelId,
        }
      );
    }),
  upsertThread: () =>
    useCvxMutationAuth(api.chat.upsertThread).withOptimisticUpdate(
      (localStore, mutationArgs) => {
        // thread query
        const threadQuery = convexQueries.getThread({
          threadUuid: mutationArgs.threadUuid,
        });
        const thread1 = localStore.getQuery(
          threadQuery.query,
          ...threadQuery.args
        );
        localStore.setQuery(threadQuery.query, ...threadQuery.args, {
          _id: thread1?._id ?? (crypto.randomUUID() as Id<"threads">),
          _creationTime: thread1?._creationTime ?? Date.now(),
          userId: thread1?.userId ?? (crypto.randomUUID() as Id<"users">),
          uuid: mutationArgs.threadUuid,
          createdAt: thread1?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
          lifecycleState: thread1?.lifecycleState ?? "active",
          liveStatus:
            mutationArgs.patch.liveStatus ?? thread1?.liveStatus ?? "completed",
          title: mutationArgs.patch.title ?? thread1?.title,
          deletedAt: thread1?.deletedAt,
          lastUsedModelId:
            mutationArgs.patch.lastUsedModelId ?? thread1?.lastUsedModelId,
        });

        // paginated query
        const paginatedQuery = convexQueries.threadHistoryPaginated({});
        const query = paginatedQuery.query;
        const args = paginatedQuery.args;

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
