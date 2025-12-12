"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useIsoLayoutEffect } from "@/hooks/utils/use-iso-layout-effect";
import { cn } from "@/lib/utils";

type Ctx = {
  attach: (el: HTMLElement | null) => void;
  isAttachedToProxy: boolean;
  hostEl: HTMLElement | null;
};

const PersistedCtx = createContext<Ctx | null>(null);

function PersistedRoot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [hostEl, setHostEl] = useState<HTMLElement | null>(null);
  const [isAttachedToProxy, setIsAttachedToProxy] = useState(false);

  useIsoLayoutEffect(() => {
    const h = document.createElement("div");
    h.style.width = "100%";
    h.style.height = "100%";
    h.setAttribute("data-slot", "persisted-host");
    h.className = cn(className);
    setHostEl(h);

    return () => {
      h.remove();
      setHostEl(null);
    };
  }, []);

  /**
   * Meant to be used as a ref={attach}
   * Handles case of mount/unmount base on the ref element null/not null
   */
  const attach = useCallback(
    (targetProxyEl: HTMLElement | null) => {
      if (!hostEl) {
        console.warn("Host element not found");
        return;
      }

      if (targetProxyEl === null) {
        hostEl.remove();
        setIsAttachedToProxy(false);
      } else {
        targetProxyEl.appendChild(hostEl);
        setIsAttachedToProxy(true);
      }
    },
    [hostEl]
  );

  const ctx = useMemo<Ctx>(
    () => ({
      attach,
      hostEl,
      isAttachedToProxy,
    }),
    [attach, hostEl, isAttachedToProxy]
  );

  return <PersistedCtx.Provider value={ctx}>{children}</PersistedCtx.Provider>;
}

function useCtx() {
  const ctx = useContext(PersistedCtx);
  if (!ctx) throw new Error("must be used within Persisted.Root.");
  return ctx;
}

function PersistedProxy({ className, ...props }: React.ComponentProps<"div">) {
  const { attach } = useCtx();
  return (
    <div
      className={cn("h-full w-full", className)}
      data-slot="persisted-proxy"
      {...props}
      ref={attach}
    />
  );
}

function PersistedTarget({ children }: { children: React.ReactNode }) {
  const { hostEl, isAttachedToProxy } = useCtx();
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if (!("requestIdleCallback" in window)) return;
    const callback = requestIdleCallback(() => {
      setIsIdle(true);
    });
    return () => {
      cancelIdleCallback(callback);
    };
  }, []);

  const show = isIdle || isAttachedToProxy;

  if (!hostEl) return null;

  return (
    <React.Activity mode={show ? "visible" : "hidden"}>
      {createPortal(children, hostEl)}
    </React.Activity>
  );
}

export const Persisted = {
  Root: PersistedRoot,
  Target: PersistedTarget,
  Proxy: PersistedProxy,
};
