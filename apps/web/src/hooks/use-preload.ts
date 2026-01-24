/**
 * Goal: data preloader functions
 */
// TODO: it's not a hook, move it elsewhere

import { deferSyncTask } from "@/helpers/defer-sync-task";
import { cvx } from "@/lib/convex/queries";
import { ensureQueryCached } from "./queries/convex/utils/use-convex-query-2-cached";
import { appLoadPromise } from "./use-app-load-status";

async function deferWhenInitialAppReadyAndCpuIdle<T>(task: () => Promise<T>) {
  await appLoadPromise.wait();
  return deferSyncTask(task);
}

export async function preloadThreadMetadata(threadUuid: string) {
  console.log(
    `preloadThreadMetadata: preload requested for thread [${threadUuid}]...`
  );
  const task = async () => {
    console.log(
      `preloadThreadMetadata: === START PRELOAD THREAD [${threadUuid}] ===`
    );
    const result = await Promise.allSettled([
      // preload thread metadata
      ensureQueryCached(
        ...cvx.query.getThread({ threadUuid }).options.neverSkip()
      ),
      // preload draft
      ensureQueryCached(
        ...cvx.query.getDraft({ threadUuid }).options.neverSkip()
      ),
    ]);
    console.log(
      `preloadThreadMetadata: === END PRELOAD THREAD [${threadUuid}] ===`
    );
    return result;
  };

  return deferWhenInitialAppReadyAndCpuIdle(task);
}

// TODO: wasn't used and need refactoring since we refactored stream resume
// export async function preloadThreadMessages(threadUuid: string) {
//   console.log(
//     `preloadThreadMessages: preload requested for thread [${threadUuid}]...`
//   );
//   const task = async () => {
//     console.log(
//       `preloadThreadMessages: === START PRELOAD THREAD MESSAGES [${threadUuid}] ===`
//     );
//     const result = await Promise.allSettled([
//       // preload thread messages
//       // TODO: better naming and better function location
//       preloadMessages(threadUuid),
//     ]);
//     console.log(
//       `preloadThreadMessages: === END PRELOAD THREAD MESSAGES [${threadUuid}] ===`
//     );
//     return result;
//   };
//   return deferWhenInitialAppReadyAndCpuIdle(task);
// }

export async function preloadUserPreferences() {
  console.log("preloadUserPreferences: preload requested...");
  const task = async () => {
    console.log(
      "preloadUserPreferences: === START PRELOAD USER PREFERENCES ==="
    );
    const result = await Promise.allSettled([
      // preload user preferences
      ensureQueryCached(...cvx.query.getChatPreferences().options.neverSkip()),
    ]);
    console.log("preloadUserPreferences: === END PRELOAD USER PREFERENCES ===");
    return result;
  };
  return deferWhenInitialAppReadyAndCpuIdle(task);
}
