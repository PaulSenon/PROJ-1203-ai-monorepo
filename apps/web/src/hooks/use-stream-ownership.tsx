import type { MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LiveStatus = MyUIMessageMetadata["liveStatus"] | undefined;
type LiveStatusKind = "ongoing" | "settled";

type StreamOwnershipOptions = {
  threadUuid: string | "skip";
  liveStatus: LiveStatus;
  isThreadPending: boolean;
};

export function getLiveStatusKind(liveStatus: LiveStatus): LiveStatusKind {
  if (liveStatus === "pending" || liveStatus === "streaming") {
    return "ongoing";
  }
  return "settled";
}

export function useStreamOwnership({
  threadUuid,
  liveStatus,
  isThreadPending,
}: StreamOwnershipOptions) {
  const [isLocalOwned, setIsLocalOwned] = useState(false);
  const prevKindRef = useRef<LiveStatusKind | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to clear ownership when threadUuid changes
  useEffect(() => {
    setIsLocalOwned(false);
    prevKindRef.current = null;
  }, [threadUuid]);

  useEffect(() => {
    if (isThreadPending) return;
    const nextKind = getLiveStatusKind(liveStatus);
    const prevKind = prevKindRef.current;
    if (prevKind === "ongoing" && nextKind === "settled") {
      setIsLocalOwned(false);
    }
    prevKindRef.current = nextKind;
  }, [isThreadPending, liveStatus]);

  const markOwned = useCallback(() => setIsLocalOwned(true), []);
  const clearOwnership = useCallback(() => setIsLocalOwned(false), []);

  return useMemo(
    () => ({ isLocalOwned, markOwned, clearOwnership }),
    [isLocalOwned, markOwned, clearOwnership]
  );
}
