"use client";

import type React from "react";
import { useCallback, useRef } from "react";

type LongPressInfo = {
  clientX: number;
  clientY: number;
  target: HTMLElement;
};

type UseLongPressOptions = {
  delay?: number;
  moveThreshold?: number;
  onLongPress: (info: LongPressInfo) => void;
  onCancel?: () => void;
  ignoreMouse?: boolean;
  enabled?: boolean;
};

type LongPressHandlers = {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
  onPointerLeave: React.PointerEventHandler<HTMLElement>;
};

const DEFAULT_DELAY_MS = 450;
const DEFAULT_MOVE_THRESHOLD_PX = 10;

export function useLongPress({
  delay = DEFAULT_DELAY_MS,
  moveThreshold = DEFAULT_MOVE_THRESHOLD_PX,
  onLongPress,
  onCancel,
  ignoreMouse = true,
  enabled = true,
}: UseLongPressOptions): LongPressHandlers {
  const startRef = useRef<LongPressInfo | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const firedRef = useRef(false);

  const reset = useCallback(
    (shouldCallCancel: boolean) => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      if (!firedRef.current && shouldCallCancel) {
        onCancel?.();
      }
      firedRef.current = false;
      startRef.current = undefined;
    },
    [onCancel]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      console.log("handlePointerDown", enabled);
      if (!enabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (ignoreMouse && event.pointerType === "mouse") {
        return;
      }
      if (event.button === 2) {
        return;
      }
      startRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.currentTarget,
      };
      firedRef.current = false;
      event.preventDefault();
      timerRef.current = window.setTimeout(() => {
        const start = startRef.current;
        if (!start) {
          return;
        }
        firedRef.current = true;
        timerRef.current = undefined;
        onLongPress(start);
      }, delay);
    },
    [delay, enabled, ignoreMouse, onLongPress]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const start = startRef.current;
      if (!start || timerRef.current === undefined) {
        return;
      }
      const distance = Math.hypot(
        event.clientX - start.clientX,
        event.clientY - start.clientY
      );
      if (distance > moveThreshold) {
        reset(true);
      }
    },
    [moveThreshold, reset]
  );

  const handlePointerEnd = useCallback(() => {
    reset(!firedRef.current);
  }, [reset]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onPointerLeave: handlePointerEnd,
  };
}

export type { LongPressInfo, UseLongPressOptions, LongPressHandlers };
