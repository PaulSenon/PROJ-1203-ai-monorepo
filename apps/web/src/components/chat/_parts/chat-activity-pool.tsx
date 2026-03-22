import { Activity, useDeferredValue, useMemo } from "react";
import { useChatNav } from "@/hooks/chat/use-chat-nav";
import {
  type ChatSessionActivityPoolContext,
  useChatSessionActivityPool,
} from "@/hooks/chat/use-chat-session-activity-pool";

export interface ChatSessionRendererProps {
  sessionId: string;
  isNew: boolean;
}

/**
 * @example how to use
 * ```tsx
 * function DefaultChatSessionRenderer({ sessionId }: { sessionId: string }) {
 *   return <div>Chat {sessionId}</div>;
 * }
 * function App() {
 *   return <ChatSessionActivityPool chatComponent={DefaultChatSessionRenderer} />;
 * }
 * ```
 * @param param0
 * @returns
 */
export function ChatSessionActivityPool({
  component: Component,
}: {
  component: React.ComponentType<ChatSessionRendererProps>;
}) {
  //! Important: must only use deferred chatNav from this point
  const DO_NOT_USE_chatNav = useChatNav();
  const deferredChatNav = useDeferredValue(DO_NOT_USE_chatNav);
  const isTransitioning = deferredChatNav !== DO_NOT_USE_chatNav;
  const rawActivityPool = useChatSessionActivityPool();

  // Ensure we always keep the lagging deferred value in activity pool
  // while transitioning.
  const activityPool = useMemo(() => {
    if (!isTransitioning) return rawActivityPool;
    const rawWithoutDeferredValue = rawActivityPool.filter(
      (s) => s.sessionId !== deferredChatNav.currentThreadUuid
    );
    if (rawWithoutDeferredValue.length === rawActivityPool.length) {
      return rawActivityPool;
    }
    return [
      ...rawWithoutDeferredValue,
      {
        sessionId: deferredChatNav.currentThreadUuid,
        isNew: deferredChatNav.isNew,
      },
    ];
  }, [
    deferredChatNav,
    rawActivityPool,
    isTransitioning,
  ]) satisfies ChatSessionActivityPoolContext;

  return (
    <>
      {activityPool.map(({ sessionId, isNew }) => (
        <Activity
          key={sessionId}
          mode={
            sessionId === deferredChatNav.currentThreadUuid
              ? "visible"
              : "hidden"
          }
        >
          <Component isNew={isNew} sessionId={sessionId} />
        </Activity>
      ))}
    </>
  );
}
