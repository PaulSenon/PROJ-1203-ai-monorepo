import { api } from "@ai-monorepo/convex/convex/_generated/api";
import type { Doc, Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { insertAtTop } from "convex/react";
import { useCvxMutationAuth } from "@/hooks/queries/convex/utils/use-convex-mutation-0-auth";
import {
  mutationBuilder,
  mutationBuilderV3,
  paginatedQueryBuilder,
  queryBuilder,
} from "./helpers";

/**
 * This is where to define all query options to use across the app.
 * So we cannot misconfigure an optimistic update.
 */

const convexQueries = {
  threadHistoryPaginated: paginatedQueryBuilder(api.chat.getThreadsForListing, {
    initialNumItems: 50,
  }),
  threadMessagesPaginated: paginatedQueryBuilder(
    api.chat.listThreadUiMessagesPaginated,
    {
      initialNumItems: 10,
    }
  ),
  threadStreamingMessagesPaginated: paginatedQueryBuilder(
    api.chat.listThreadStreamingMessagesPaginated,
    {
      initialNumItems: 10,
    }
  ),
  // findMessageStream: queryBuilder(api.chat.findMessageStream),
  getChatPreferences: queryBuilder(api.users.getUserChatPreferences),
  getThread: queryBuilder(api.chat.getThread),
  getAllThreadMessagesAsc: queryBuilder(api.chat.getAllThreadMessagesAsc),
  getCurrentUser: queryBuilder(api.users.getCurrentUser),
  getDraft: queryBuilder(api.chat.getDraft),
} as const;

// TODO: WIP trying to find the right abstraction between factory of useMutation hooks, or closer to how convex query work, with this thing that allow using a builder to create mutation args builder, with prefilled and typesafe, function and optimistic update. Then we just need to pass args when wanting to create mutation args. But this require calling the mutation in place and with convex client.
// TODO: update, perhaps the v3 is the way to go. Because currently it's either bad DX or extremely not optimized (because triggers rerenders)
/**
 * @example
 * ```ts
 * const convex = useConvex();
 *
 * const mutationOptions = useMemo(() => {
 *  return cvx.mutationV2.draft.upsert({
 *     threadUuid,
 *     data: {
 *       content: draft,
 *     },
 *   }).options();
 * }, [draft, threadUuid]);
 *
 * const upsertDraft = useCallback(() => {
 *   return convex.mutation(...mutationOptions);
 * }, [convex, mutationOptions]);
 *
 * // usagge:
 * upsertDraft();
 * ```
 * VS
 * ```ts
 * const mutation = cvx.mutation.draft.upsert();
 *
 * // usagge:
 * mutation({
 *   threadUuid,
 *   data: {
 *     content: draft,
 *   },
 * });
 * ```
 */
const convexMutationV2 = {
  draft: {
    upsert: mutationBuilder(api.chat.upsertDraft, {
      optimisticUpdate: (localStore, mutationArgs) => {
        const draftQuery = convexQueries.getDraft({
          threadUuid: mutationArgs.threadUuid,
        });
        const draft = localStore.getQuery(draftQuery.query, ...draftQuery.args);
        // TODO: maybe not ...args but just args[0] ?
        localStore.setQuery(draftQuery.query, ...draftQuery.args, {
          // if new
          _id: crypto.randomUUID() as Id<"drafts">,
          _creationTime: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: crypto.randomUUID() as Id<"users">,
          threadId: crypto.randomUUID() as Id<"threads">,
          // if existing
          ...draft,
          // optimistic patch
          data: mutationArgs.data,
        });
      },
    }),
    delete: mutationBuilder(api.chat.deleteDraft, {
      optimisticUpdate: (localStore, mutationArgs) => {
        const draftQuery = convexQueries.getDraft({
          threadUuid: mutationArgs.threadUuid,
        });
        const draft = localStore.getQuery(draftQuery.query, ...draftQuery.args);
        if (!draft) return;
        localStore.setQuery(draftQuery.query, ...draftQuery.args, {
          ...draft,
          data: undefined,
        });
      },
    }),
  },
  userPreferences: {
    upsert: mutationBuilder(api.users.upsertUserChatPreferences, {
      optimisticUpdate: (localStore, mutationArgs) => {
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
            lastUsedModelId: mutationArgs?.patch?.lastUsedModelId,
            modelToPickForNewThread:
              mutationArgs?.patch?.modelToPickForNewThread ??
              value?.modelToPickForNewThread ??
              "lastUsed",
          }
        );
      },
    }),
  },
};

const convexMutationV3 = {
  threads: {
    upsert: mutationBuilderV3(api.chat.upsertThread, {
      optimisticUpdate: (localStore, mutationArgs) => {
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
      },
    }),
  },
};

const convexMutations = {
  draft: {
    upsert: () =>
      useCvxMutationAuth(api.chat.upsertDraft).withOptimisticUpdate(
        (localStore, mutationArgs) => {
          const draftQuery = convexQueries.getDraft({
            threadUuid: mutationArgs.threadUuid,
          });
          const draft = localStore.getQuery(
            draftQuery.query,
            ...draftQuery.args
          );
          // TODO: maybe not ...args but just args[0] ?
          localStore.setQuery(draftQuery.query, ...draftQuery.args, {
            // if new
            _id: crypto.randomUUID() as Id<"drafts">,
            _creationTime: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId: crypto.randomUUID() as Id<"users">,
            threadId: crypto.randomUUID() as Id<"threads">,
            // if existing
            ...draft,
            // optimistic patch
            data: mutationArgs.data,
          });
        }
      ),
    delete: () =>
      useCvxMutationAuth(api.chat.deleteDraft).withOptimisticUpdate(
        (localStore, mutationArgs) => {
          const draftQuery = convexQueries.getDraft({
            threadUuid: mutationArgs.threadUuid,
          });
          const draft = localStore.getQuery(
            draftQuery.query,
            ...draftQuery.args
          );
          if (!draft) return;
          localStore.setQuery(draftQuery.query, ...draftQuery.args, {
            ...draft,
            data: undefined,
          });
        }
      ),
  },
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
          lastUsedModelId: mutationArgs?.patch?.lastUsedModelId,
          modelToPickForNewThread:
            mutationArgs?.patch?.modelToPickForNewThread ??
            value?.modelToPickForNewThread ??
            "lastUsed",
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
  mutationV2: convexMutationV2,
  mutationV3: convexMutationV3,
};
