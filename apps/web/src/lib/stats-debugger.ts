type Stats = {
  avg: number;
  med: number;
  count: number;
  variance: number;
  std: number;
  skew: number;
  cv: number;
  goodEnough: boolean;
};

/**
 * This give you a stats debugger that you can use to
 * - record a new value for a key (e.g. ms duration)
 * - get/log the full compiled stats for a single key or all keys
 *
 * @example
 * ```ts
 * const statsDebugger = createStatsDebugger();
 *
 * const startTime = performance.now();
 * // DO SOME HEAVY WORK
 * const durationMs = performance.now() - startTime;
 * statsDebugger.addValue('my-value', durationMs);
 *
 * // other usages
 * statsDebugger.log('my-value');
 * statsDebugger.logAll();
 * const myValueStats = statsDebugger.get('my-value');
 * const allStats = statsDebugger.getAll();
 * statsDebugger.clear('my-value');
 * statsDebugger.clearAll();
 * ```
 */
export function createStatsDebugger() {
  const map: Map<string, number[]> = new Map();

  const get = (key: string): Stats | undefined => {
    const values = map.get(key);
    if (values === undefined || values.length === 0) {
      console.warn(`stats ${key}: no value yet`);
      return;
    }

    const count = values.length;
    const total = values.reduce((acc, value) => acc + value, 0);
    const avg = total / count;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(count / 2);
    const med =
      count % 2 === 1
        ? (sorted[mid] ?? 0)
        : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

    const variance =
      count > 1
        ? values.reduce((sum, x) => sum + (x - avg) ** 2, 0) / (count - 1)
        : 0;

    const std = Math.sqrt(variance);

    const skew = avg === 0 ? 0 : Math.abs(avg - med) / avg;
    const cv = avg === 0 ? 0 : std / avg;

    const goodEnough = count >= 10 && cv < 0.1 && skew < 0.1;

    return {
      avg,
      med,
      count,
      variance,
      std,
      skew,
      cv,
      goodEnough,
    };
  };

  const getAll = () => {
    const result: Record<string, Stats> = {};
    for (const [key] of map) {
      const stats = get(key);
      if (!stats) continue;
      result[key] = stats;
    }
    return result;
  };

  const log = (key: string) => {
    const stats = get(key);
    console.log(
      `Stats Debugger: ${stats?.goodEnough ? " [OK]" : ""} ${key}`,
      stats
    );
  };

  const addValue = (key: string, value: number) => {
    const prev = map.get(key) ?? [];
    map.set(key, [...prev, value]);
    log(key);
  };

  const clear = (key: string) => {
    map.delete(key);
  };

  const clearAll = () => {
    map.clear();
  };

  const logAll = () => {
    console.log("Stats Debugger: All:", getAll());
  };

  return {
    addValue,
    log,
    clear,
    clearAll,
    logAll,
    getAll,
    get,
  };
}

declare global {
  interface Window {
    __globalStatsDebugger: ReturnType<typeof createStatsDebugger>;
  }
}

export const globalStatsDebugger = createStatsDebugger();
window.__globalStatsDebugger = globalStatsDebugger;
