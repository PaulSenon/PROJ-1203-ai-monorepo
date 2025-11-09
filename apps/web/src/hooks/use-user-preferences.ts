import { cvx } from "@/lib/convex/queries";
import { useCvxQueryCached } from "./queries/convex/utils/use-convex-query-2-cached";

// TODO: not finished I think
export function useUserPreferences() {
  const preferences = useCvxQueryCached(
    ...cvx.query.getChatPreferences.options.neverSkip()
  );
  const updatePreferences = cvx.mutations.upsertChatPreferences();

  return {
    preferences,
    updatePreferences,
  };
}
