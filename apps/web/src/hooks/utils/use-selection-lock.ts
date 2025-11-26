"use client";

import { useCallback, useRef } from "react";

type SelectionLockState = {
  styleElement: HTMLStyleElement | null;
  documentUserSelect: string;
  documentTouchCallout: string;
  bodyUserSelect: string;
  bodyTouchCallout: string;
};

type UseSelectionLockReturn = {
  lock: () => void;
  unlock: () => void;
  isLocked: () => boolean;
};

export function useSelectionLock(): UseSelectionLockReturn {
  const stateRef = useRef<SelectionLockState | null>(null);

  const isLocked = useCallback(() => stateRef.current !== null, []);

  const lock = useCallback(() => {
    if (typeof document === "undefined" || stateRef.current !== null) {
      return;
    }

    const state: SelectionLockState = {
      styleElement: null,
      documentUserSelect: document.documentElement.style.userSelect,
      documentTouchCallout: document.documentElement.style.getPropertyValue(
        "-webkit-touch-callout"
      ),
      bodyUserSelect: document.body?.style.userSelect ?? "",
      bodyTouchCallout:
        document.body?.style.getPropertyValue("-webkit-touch-callout") ?? "",
    };

    const style = document.createElement("style");
    style.setAttribute("data-selection-lock", "true");
    style.textContent =
      "* { user-select: none !important; -webkit-user-select: none !important; -webkit-touch-callout: none !important; }";
    document.head.appendChild(style);
    state.styleElement = style;

    document.documentElement.style.setProperty(
      "user-select",
      "none",
      "important"
    );
    document.documentElement.style.setProperty(
      "-webkit-user-select",
      "none",
      "important"
    );
    document.documentElement.style.setProperty(
      "-webkit-touch-callout",
      "none",
      "important"
    );

    if (document.body) {
      document.body.style.setProperty("user-select", "none", "important");
      document.body.style.setProperty(
        "-webkit-user-select",
        "none",
        "important"
      );
      document.body.style.setProperty(
        "-webkit-touch-callout",
        "none",
        "important"
      );
    }

    stateRef.current = state;
  }, []);

  const unlock = useCallback(() => {
    if (typeof document === "undefined" || stateRef.current === null) {
      return;
    }

    const state = stateRef.current;

    if (state.styleElement) {
      state.styleElement.remove();
    }

    document.documentElement.style.removeProperty("-webkit-user-select");
    document.documentElement.style.removeProperty("-webkit-touch-callout");
    document.documentElement.style.userSelect = state.documentUserSelect;
    document.documentElement.style.setProperty(
      "-webkit-touch-callout",
      state.documentTouchCallout
    );

    if (document.body) {
      document.body.style.removeProperty("-webkit-user-select");
      document.body.style.removeProperty("-webkit-touch-callout");
      document.body.style.userSelect = state.bodyUserSelect;
      document.body.style.setProperty(
        "-webkit-touch-callout",
        state.bodyTouchCallout
      );
    }

    stateRef.current = null;
  }, []);

  return { lock, unlock, isLocked };
}
