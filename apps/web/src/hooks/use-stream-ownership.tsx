import type { MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WithAutocomplete } from "@/lib/utils";

type LiveStatus = MyUIMessageMetadata["liveStatus"];
type LiveStatusKind = "ongoing" | "settled";

type StreamOwnershipOptions = {
  threadUuid: string | "skip";
  liveStatus?: LiveStatus;
  isThreadQueryPending: boolean;
};

// TODO regroup all logics (api-service / use-chat-active / here)
export function getLiveStatusKind(
  liveStatus?: WithAutocomplete<LiveStatus>
): LiveStatusKind {
  if (liveStatus === "pending" || liveStatus === "streaming") {
    return "ongoing";
  }
  return "settled";
}

export function useStreamOwnership({
  threadUuid,
  liveStatus,
  isThreadQueryPending,
}: StreamOwnershipOptions) {
  const [isLocalOwned, setIsLocalOwned] = useState(false);
  const prevThreadUuid = useRef<string | "skip">(null);
  const prevKindRef = useRef<LiveStatusKind | null>(null);

  useEffect(() => {
    const prevUuidSnapshot = prevThreadUuid.current;
    prevThreadUuid.current = threadUuid;
    // IMPORTANT ignore reset when transitioning from "skip" no an uuid
    // otherwise we treat the placeholder uuid before we persist one in url (different)
    // and we lose the localOwnership flag because thing we just switched to another thread.
    if (prevUuidSnapshot === "skip") return;

    setIsLocalOwned(false);
    prevKindRef.current = null;
  }, [threadUuid]);

  useEffect(() => {
    if (isThreadQueryPending) return;
    const nextKind = getLiveStatusKind(liveStatus);
    const prevKind = prevKindRef.current;
    if (prevKind === "ongoing" && nextKind === "settled") {
      setIsLocalOwned(false);
    }
    prevKindRef.current = nextKind;
  }, [isThreadQueryPending, liveStatus]);

  const markOwned = useCallback(() => setIsLocalOwned(true), []);
  const clearOwnership = useCallback(() => setIsLocalOwned(false), []);

  return useMemo(
    () => ({ isLocalOwned, markOwned, clearOwnership }),
    [isLocalOwned, markOwned, clearOwnership]
  );
}
