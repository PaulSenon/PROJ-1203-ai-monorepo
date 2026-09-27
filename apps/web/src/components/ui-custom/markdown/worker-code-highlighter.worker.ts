/// <reference lib="webworker" />

import { createCodePlugin } from "@streamdown/code";
import type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
} from "./worker-code-highlighter-protocol";

const codePlugin = createCodePlugin({
  themes: ["github-light", "github-dark"],
});

const postResult = (message: WorkerIncomingMessage) => {
  self.postMessage(message);
};

self.addEventListener(
  "message",
  (event: MessageEvent<WorkerOutgoingMessage>) => {
    const payload = event.data;
    if (payload.type !== "highlight") {
      return;
    }

    const { key, options, requestId } = payload;

    try {
      console.log(`${payload.requestId} WORKER: highlight requested:`, payload);
      const cachedResult = codePlugin.highlight(options, (result) => {
        postResult({
          type: "result",
          key,
          requestId,
          result,
        });
      });
      console.log(`${payload.requestId} WORKER: highlight done:`, payload);

      if (!cachedResult) {
        return;
      }

      postResult({
        type: "result",
        key,
        requestId,
        result: cachedResult,
      });
    } catch (error) {
      postResult({
        type: "error",
        key,
        requestId,
        message: error instanceof Error ? error.message : "Highlight failed",
      });
    }
  }
);
