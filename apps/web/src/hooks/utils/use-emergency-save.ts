import { useCallback, useEffect } from "react";
import { usePageUnload } from "./use-page-unload";

/**
 * Hook that can be used when doing critical async operation that
 * will be lost if page is unloaded.
 * Right before page unload, if the isInEmergencyState function returns true,
 * the data will be saved to localStorage. with the provided key.
 * Next time you component remount, if there is any emergency data saved for this key,
 * the restoreCallback function will be called with the saved data.
 *
 * WARNING: You must still handle conflict resolution in your restoreCallback function.
 * (the callback will be called with the timestamp of the saved data for your convenience)
 * WARNING: You must also handle idempotency in your restoreCallback function
 * (to make sure if restore callback is called after your operation succeeds, it won't mess up your data)
 *
 * @example
 * ```ts
 * // using tanstack query
 * const queryKey = ["draft", draftId];
 * const { data } = useQuery({
 *   queryKey,
 *   queryFn: () => fetchDraft(draftId),
 * });
 * const setDraft = useMutation({
 *   mutationFn: (data: string) => updateDraft(draftId, data),
 *   onSuccess: (data) => {
 *     queryClient.invalidateQueries({ queryKey });
 *   },
 * });
 * useEmergencySave({
 *   key: queryKey.join(":"),
 *   data,
 *   // the function to restore the data (the one that has been skipped by page unload)
 *   restoreCallback: (data) => {
 *     setDraft.mutate(data);
 *   },
 *   // we need to save only if a mutation is pending while page is unloading
 *   isInEmergencyState: () => setDraft.isPending,
 * });
 * ```
 */

type EmergencySaveOptions<T1, T2 extends T1> = {
  // must be stable between page loads
  key: string;
  // the data state to save in case of emergency
  data: T1;
  // the setter function to restore the data (the one that has been skipped by page unload)
  restoreCallback: (data: T2, { savedAt }: { savedAt: number }) => unknown;
  // the function telling if we are in a state that should be saved in case of emergency
  isInEmergencyState: () => boolean;
};
export function useEmergencySave<T1, T2 extends T1>(
  options: EmergencySaveOptions<T1, T2>
) {
  const { key, restoreCallback, data, isInEmergencyState } = options;

  const emergencySaveKey = `emergency-save:${key}`;
  useEffect(() => {
    const rawData = localStorage.getItem(emergencySaveKey);
    if (!rawData) return;
    try {
      localStorage.removeItem(emergencySaveKey);
      console.log("EMERGENCY SAVE RESTORED", { key, rawData });
      const res = JSON.parse(rawData);
      restoreCallback(res, { savedAt: Date.now() });
    } catch (_error) {
      console.error("Error parsing emergency save", _error);
    }
  }, [key, emergencySaveKey, restoreCallback]);

  const emergencySave = useCallback(() => {
    if (!isInEmergencyState()) return;
    console.log("EMERGENCY SAVE TRIGGERED", { key, data });
    localStorage.setItem(emergencySaveKey, JSON.stringify(data));
  }, [key, data, isInEmergencyState, emergencySaveKey]);

  usePageUnload(emergencySave);
}
