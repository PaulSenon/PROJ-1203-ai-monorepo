"use client";

import type {
  CodeHighlighterPlugin,
  HighlightOptions,
  HighlightResult,
} from "@streamdown/code";
import type { BundledLanguage, BundledTheme } from "shiki";
import {
  createHighlightKey,
  type WorkerIncomingMessage,
  type WorkerOutgoingMessage,
} from "./worker-code-highlighter-protocol";

type WorkerCodePluginOptions = {
  themes?: [BundledTheme, BundledTheme];
};

type InFlightRequest = {
  requestId: number;
  callbacks: Set<(result: HighlightResult) => void>;
};

const DEFAULT_THEMES: [BundledTheme, BundledTheme] = [
  "github-light",
  "github-dark",
];

const LOG_PREFIX = "[smooth-markdown]";

export const createWorkerCodePlugin = (
  options: WorkerCodePluginOptions = {}
): CodeHighlighterPlugin => {
  const themes = options.themes ?? DEFAULT_THEMES;

  let worker: Worker | null = null;
  let workerFailed = false;
  let hasLoggedFailure = false;
  let requestIdCounter = 0;

  const cache = new Map<string, HighlightResult>();
  const inFlightByKey = new Map<string, InFlightRequest>();

  const clearWorker = () => {
    if (!worker) {
      return;
    }

    worker.terminate();
    worker = null;
  };

  const disableWorker = (message: string, error?: unknown) => {
    workerFailed = true;
    inFlightByKey.clear();
    clearWorker();

    if (hasLoggedFailure) {
      return;
    }

    hasLoggedFailure = true;
    console.error(`${LOG_PREFIX} ${message}`, error);
  };

  const ensureWorker = (): Worker | null => {
    if (workerFailed || typeof window === "undefined") {
      return null;
    }

    if (worker) {
      return worker;
    }

    try {
      const nextWorker = new Worker(
        new URL("./worker-code-highlighter.worker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      nextWorker.addEventListener(
        "message",
        (event: MessageEvent<WorkerIncomingMessage>) => {
          const payload = event.data;
          const inFlightRequest = inFlightByKey.get(payload.key);

          if (
            !inFlightRequest ||
            inFlightRequest.requestId !== payload.requestId
          ) {
            return;
          }

          inFlightByKey.delete(payload.key);

          if (payload.type === "error") {
            disableWorker("Worker highlight failed", payload.message);
            return;
          }

          cache.set(payload.key, payload.result);
          for (const callback of inFlightRequest.callbacks) {
            callback(payload.result);
          }
        }
      );

      const onFatalWorkerError = (error: unknown) => {
        disableWorker("Worker highlighter disabled", error);
      };

      nextWorker.addEventListener("error", onFatalWorkerError);
      nextWorker.addEventListener("messageerror", onFatalWorkerError);

      worker = nextWorker;
      return worker;
    } catch (error) {
      disableWorker("Failed to create code highlighter worker", error);
      return null;
    }
  };

  return {
    name: "shiki",
    type: "code-highlighter",
    supportsLanguage: (_language: BundledLanguage) => true,
    getSupportedLanguages: () => [],
    getThemes: () => themes,
    highlight: (options: HighlightOptions, callback) => {
      const requestOptions: HighlightOptions = {
        ...options,
        themes,
      };

      const key = createHighlightKey(requestOptions);
      const cachedResult = cache.get(key);

      if (cachedResult) {
        return cachedResult;
      }

      const activeWorker = ensureWorker();
      if (!activeWorker) {
        return null;
      }

      const inFlightRequest = inFlightByKey.get(key);
      if (inFlightRequest) {
        if (callback) {
          inFlightRequest.callbacks.add(callback);
        }
        return null;
      }

      const callbacks = new Set<(result: HighlightResult) => void>();
      if (callback) {
        callbacks.add(callback);
      }

      const requestId = ++requestIdCounter;
      inFlightByKey.set(key, {
        requestId,
        callbacks,
      });

      const request: WorkerOutgoingMessage = {
        type: "highlight",
        requestId,
        key,
        options: requestOptions,
      };

      activeWorker.postMessage(request);
      return null;
    },
  };
};

export const workerCodePlugin = createWorkerCodePlugin();
