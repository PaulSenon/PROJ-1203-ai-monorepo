import { cvx } from "@/lib/convex/queries";
import { useCvxQueryCached } from "./convex/utils/use-convex-query-2-cached";

export function useUserPreferencesQuery({ skip }: { skip?: boolean } = {}) {
  const isSkip = skip ?? false;
  return useCvxQueryCached(
    ...cvx.query.getChatPreferences().options.skipWhen(isSkip)
  );
}

export function useUserPreferencesMutation() {
  return cvx.mutations.upsertChatPreferences();
}
