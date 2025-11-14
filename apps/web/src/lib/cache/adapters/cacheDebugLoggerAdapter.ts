/**
 * AI Generated cache debugger. For debugging purposes only.
 */

import type { ICacheAdapter } from "../ICacheAdapter";

type CacheLogEntry = {
  timestamp: number;
  operation: "get" | "set" | "del" | "clear";
  key?: string;
  status?: "hit" | "miss";
  value?: unknown;
};

type KeyStats = {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
};

type PrefixStats = {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
  clears: number;
  uniqueKeys: Set<string>;
};

type GlobalStats = {
  totalOperations: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDels: number;
  totalClears: number;
  hitRate: number;
};

type CacheDebugOptions = {
  enabled?: boolean;
  logToConsole?: boolean;
  includeValue?: boolean;
};

type CacheDebugAPI = {
  getAllLogs: () => CacheLogEntry[];
  getLogsByPrefix: (prefix: string) => CacheLogEntry[];
  getStatsByKey: (key: string) => KeyStats | undefined;
  getStatsByPrefix: (prefix: string) => PrefixStats;
  getGlobalStats: () => GlobalStats;
  clearLogs: () => void;
  getLogs: (options?: {
    prefix?: string;
    operation?: CacheLogEntry["operation"];
    status?: CacheLogEntry["status"];
  }) => CacheLogEntry[];
};

const logs: CacheLogEntry[] = [];
const keyStats = new Map<string, KeyStats>();
const prefixStats = new Map<string, PrefixStats>();

const updateKeyStats = (
  key: string,
  operation: "get" | "set" | "del",
  status?: "hit" | "miss"
): void => {
  const stats = keyStats.get(key) ?? {
    hits: 0,
    misses: 0,
    sets: 0,
    dels: 0,
  };

  if (operation === "get") {
    if (status === "hit") {
      stats.hits += 1;
    } else if (status === "miss") {
      stats.misses += 1;
    }
  } else if (operation === "set") {
    stats.sets += 1;
  } else if (operation === "del") {
    stats.dels += 1;
  }

  keyStats.set(key, stats);
};

const updatePrefixStats = (
  key: string,
  operation: "get" | "set" | "del" | "clear",
  status?: "hit" | "miss"
): void => {
  const parts = key.split(":");
  for (let i = 1; i <= parts.length; i += 1) {
    const prefix = parts.slice(0, i).join(":");
    const stats = prefixStats.get(prefix) ?? {
      hits: 0,
      misses: 0,
      sets: 0,
      dels: 0,
      clears: 0,
      uniqueKeys: new Set<string>(),
    };

    stats.uniqueKeys.add(key);

    if (operation === "get") {
      if (status === "hit") {
        stats.hits += 1;
      } else if (status === "miss") {
        stats.misses += 1;
      }
    } else if (operation === "set") {
      stats.sets += 1;
    } else if (operation === "del") {
      stats.dels += 1;
    } else if (operation === "clear") {
      stats.clears += 1;
    }

    prefixStats.set(prefix, stats);
  }
};

const addLog = (
  entry: CacheLogEntry,
  options: Required<CacheDebugOptions>
): void => {
  logs.push(entry);

  if (entry.key && entry.operation !== "clear") {
    updateKeyStats(entry.key, entry.operation, entry.status);
    updatePrefixStats(entry.key, entry.operation, entry.status);
  }

  if (options.logToConsole) {
    if (options.includeValue && entry.value !== undefined) {
      console.log(
        "[CACHE DEBUG]",
        entry.operation,
        entry.key,
        entry.status,
        entry.value
      );
    } else {
      console.log("[CACHE DEBUG]", entry.operation, entry.key, entry.status);
    }
  }
};

const createAPI = (): CacheDebugAPI => ({
  getAllLogs: () => [...logs],

  getLogsByPrefix: (prefix: string) =>
    logs.filter((log) => log.key?.startsWith(prefix)),

  getStatsByKey: (key: string) => keyStats.get(key),

  getStatsByPrefix: (prefix: string) => {
    const stats = prefixStats.get(prefix);
    if (!stats) {
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        dels: 0,
        clears: 0,
        uniqueKeys: new Set<string>(),
      };
    }
    return {
      ...stats,
      uniqueKeys: new Set(stats.uniqueKeys),
    };
  },

  getGlobalStats: (): GlobalStats => {
    const totalHits = Array.from(keyStats.values()).reduce(
      (sum, stats) => sum + stats.hits,
      0
    );
    const totalMisses = Array.from(keyStats.values()).reduce(
      (sum, stats) => sum + stats.misses,
      0
    );
    const totalSets = Array.from(keyStats.values()).reduce(
      (sum, stats) => sum + stats.sets,
      0
    );
    const totalDels = Array.from(keyStats.values()).reduce(
      (sum, stats) => sum + stats.dels,
      0
    );
    const totalClears = logs.filter((log) => log.operation === "clear").length;
    const totalOperations = logs.length;
    const hitRate =
      totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      totalOperations,
      totalHits,
      totalMisses,
      totalSets,
      totalDels,
      totalClears,
      hitRate,
    };
  },

  clearLogs: () => {
    logs.length = 0;
    keyStats.clear();
    prefixStats.clear();
  },

  getLogs: (options) => {
    let filtered = logs;

    if (options?.prefix) {
      // TODO: TS weird thing: why the above it not enough to narrow down the type ?
      const prefix = options.prefix;
      filtered = filtered.filter((log) => log.key?.startsWith(prefix));
    }

    if (options?.operation) {
      filtered = filtered.filter((log) => log.operation === options.operation);
    }

    if (options?.status) {
      filtered = filtered.filter((log) => log.status === options.status);
    }

    return filtered;
  },
});

let apiInstance: CacheDebugAPI | null = null;

const getAPI = (): CacheDebugAPI => {
  if (!apiInstance) {
    apiInstance = createAPI();
    if (typeof window !== "undefined") {
      (window as { cacheDebug?: CacheDebugAPI }).cacheDebug = apiInstance;
    }
  }
  return apiInstance;
};

export function cacheDebugLoggerAdapter<
  TKey extends string = string,
  TValue = unknown,
>(
  adapter: ICacheAdapter<TKey, TValue>,
  options: CacheDebugOptions = {}
): ICacheAdapter<TKey, TValue> {
  const opts: Required<CacheDebugOptions> = {
    enabled: options.enabled ?? true,
    logToConsole: options.logToConsole ?? false,
    includeValue: options.includeValue ?? false,
  };

  if (!opts.enabled) {
    return adapter;
  }

  getAPI();

  return {
    get: async (key: TKey): Promise<TValue | undefined> => {
      const value = await adapter.get(key);
      const status: "hit" | "miss" = value === undefined ? "miss" : "hit";

      addLog(
        {
          timestamp: Date.now(),
          operation: "get",
          key,
          status,
          ...(opts.includeValue ? { value } : {}),
        },
        opts
      );

      return value;
    },

    set: async (key: TKey, value: TValue): Promise<void> => {
      await adapter.set(key, value);

      addLog(
        {
          timestamp: Date.now(),
          operation: "set",
          key,
          ...(opts.includeValue ? { value } : {}),
        },
        opts
      );
    },

    del: async (key: TKey): Promise<void> => {
      await adapter.del(key);

      addLog(
        {
          timestamp: Date.now(),
          operation: "del",
          key,
        },
        opts
      );
    },

    clear: async (): Promise<void> => {
      await adapter.clear();

      addLog(
        {
          timestamp: Date.now(),
          operation: "clear",
        },
        opts
      );
    },
  };
}
