import { cvx } from "@/lib/convex/queries";
import { useCvxQueryCached } from "./queries/convex/utils/use-convex-query-2-cached";

export function useUserPreferences() {
  return useCvxQueryCached(
    ...cvx.query.getChatPreferences().options.neverSkip()
  );
}

export function useUserPreferencesMutation() {
  return cvx.mutations.upsertChatPreferences();
}
