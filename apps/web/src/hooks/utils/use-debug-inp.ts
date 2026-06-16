import { useEffect } from "react";
import { globalStatsDebugger } from "@/lib/stats-debugger";

export function useDebugInpLogger({
  getKey,
  querySelector,
  entryTypes,
}: {
  getKey: (target: Element) => string;
  querySelector: string;
  entryTypes: string[];
}) {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        if (!entryTypes.includes(entry.name)) continue;
        if (!(entry.target instanceof Element)) continue;
        const el = entry.target.closest(querySelector);
        if (!el) continue;

        const key = getKey(el);
        globalStatsDebugger.addValue(key, entry.duration);
      }
    });
    observer.observe({ type: "event", buffered: true });
    return () => observer.disconnect();
  }, [getKey, querySelector, entryTypes]);
}
