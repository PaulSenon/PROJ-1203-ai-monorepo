import { useEffect, useRef } from "react";
import { useChatNav } from "../use-chat-nav";
import { visibilityCoordinator } from "./app-ready-visibility";

export function AppVisibilityNavBridge() {
  const { currentThreadUuid, isNew } = useChatNav();
  const hasBootedRef = useRef(false);
  const previousThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("AppReadyVisibility: navigation bridge triggered", {
      previousThreadID: previousThreadIdRef.current,
      currentThreadUuid,
      isNew,
    });

    // The very first trigger must dispatch an "initial-load" run
    if (!hasBootedRef.current) {
      hasBootedRef.current = true;
      previousThreadIdRef.current = currentThreadUuid;

      visibilityCoordinator.startRun("initial-load", {
        runKey: currentThreadUuid,
      });
      return;
    }

    //! ORDER IS IMPORTANT
    if (previousThreadIdRef.current === currentThreadUuid) return;
    //! NO nav-to-session related early return before this line
    //! (apart from prev === current check of course)
    previousThreadIdRef.current = currentThreadUuid;

    // This is some little quality of life improvement. This is not core logic.
    // this pairs with the facts:
    //  - we don't defer new chat rendering in active-chat-session.tsx
    // This avoid 1 repaint for the overlay.
    // This can be deleted safely. You just need to ensure the "new conversation" path
    // triggers the ready event for messages-list.tsx
    if (isNew) return;

    // Every other trigger must dispatch a "nav-to-session" run
    visibilityCoordinator.startRun("nav-to-session", {
      runKey: currentThreadUuid,
    });
  }, [currentThreadUuid, isNew]);

  return null;
}
