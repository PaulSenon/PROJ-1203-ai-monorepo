import { Activity, useEffect, useState } from "react";
import { useChatNav } from "@/hooks/chat/use-chat-nav";
import { useChatSessionActivityPool } from "@/hooks/chat/use-chat-session-activity-pool";
import { yieldNextTask } from "@/lib/schedule-work";

export interface ChatSessionRendererProps {
  sessionId: string;
  isNew: boolean;
}

/**
 * This hook is intended to be used in place of useDeferred value
 * when you need to defer some value without putting the whole subtree too low priority.
 *
 * This defer a value reactivity by next scheduler task (if api available) or one macrotask.
 *
 * It's basically a little delayed state.
 *
 * Use case:
 *  - you want instant navigation feedback (loading UI, active link)
 *  - you want changing page content right after (but still have time to see the instant feedback first)
 *  - but your page content is still critical and should be treated as high priority once instant feedback is painted.
 *
 * In my test cases this significantly wins 200ms in heavy thread nav on x6 CPU Slowdown vs useDeferredValue
 * while achieving same low INP.
 * e.g.
 * - normal state:      INP=1050ms (bad)   LOAD_TIME=1150ms (good)
 * - deferred value:    INP=250ms  (good)  LOAD_TIME=1600ms (bad)
 * - my deferred hack:  INP=263ms  (good)  LOAD_TIME=1350ms (ok)
 */
function useDeferredValueFast<T>(value: T): T {
  const [deferredValue, setDeferredValue] = useState<T>(value);

  useEffect(() => {
    const abortController = new AbortController();

    yieldNextTask({ signal: abortController.signal }).then(() => {
      setDeferredValue(value);
    });

    return () => {
      abortController.abort();
    };
  }, [value]);

  return deferredValue;
}

/**
 * Render active chat session from nav given a chat session renderer
 * But also prerender Activity pool for perf
 *
 * (customize chat session preload in useChatSessionActivityPool)
 *
 * @example how to use
 * ```tsx
 * function DefaultChatSessionRenderer({ sessionId }: { sessionId: string }) {
 *   return <div>Chat {sessionId}</div>;
 * }
 * function App() {
 *   return <ActiveChatSessionPool chatComponent={DefaultChatSessionRenderer} />;
 * }
 * ```
 */
export function ActiveChatSessionPool({
  component: Component,
}: {
  component: React.ComponentType<ChatSessionRendererProps>;
}) {
  //! Important: must only use deferred chatNav from this point
  const targetNav = useChatNav();
  const deferredNav = useDeferredValueFast(targetNav);
  // const deferredNav = targetNav; // DEBUG

  // use deferred value only when no a new chat
  const activeNav = targetNav.isNew ? targetNav : deferredNav;

  // transition flag when lagging behind nav state
  const isTransitioning =
    activeNav.currentThreadUuid !== targetNav.currentThreadUuid;

  // compute session pool including the deferred one if transitioning
  const targetActivityPool = useChatSessionActivityPool();

  return (
    <>
      {targetActivityPool.map(({ sessionId, isNew }) => (
        <Activity
          key={sessionId}
          mode={
            sessionId === activeNav.currentThreadUuid && !isTransitioning
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

/**
 * Render active chat session from nav given a session renderer component.
 *
 * @example how to use
 * ```tsx
 * function DefaultChatSessionRenderer({ sessionId }: { sessionId: string }) {
 *   return <div>Chat {sessionId}</div>;
 * }
 * function App() {
 *   return <ActiveChatSession chatComponent={DefaultChatSessionRenderer} />;
 * }
 * ```
 */
export function ActiveChatSession({
  component: Component,
}: {
  component: React.ComponentType<ChatSessionRendererProps>;
}) {
  const targetNav = useChatNav();
  const deferredNav = useDeferredValueFast(targetNav);
  // const deferredNav = targetNav; // DEBUG

  // use deferred value only when not a new chat
  const activeNav = targetNav.isNew ? targetNav : deferredNav;

  return (
    <Component
      isNew={activeNav.isNew}
      sessionId={activeNav.currentThreadUuid}
    />
  );
}
