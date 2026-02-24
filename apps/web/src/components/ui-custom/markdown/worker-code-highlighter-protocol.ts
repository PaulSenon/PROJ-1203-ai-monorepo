import type { HighlightOptions, HighlightResult } from "@streamdown/code";

export type WorkerHighlightRequestMessage = {
  type: "highlight";
  requestId: number;
  key: string;
  options: HighlightOptions;
};

export type WorkerHighlightResultMessage = {
  type: "result";
  requestId: number;
  key: string;
  result: HighlightResult;
};

export type WorkerHighlightErrorMessage = {
  type: "error";
  requestId: number;
  key: string;
  message: string;
};

export type WorkerIncomingMessage =
  | WorkerHighlightResultMessage
  | WorkerHighlightErrorMessage;

export type WorkerOutgoingMessage = WorkerHighlightRequestMessage;

export const createHighlightKey = (options: HighlightOptions): string =>
  `${options.language}\u0000${options.themes[0]}\u0000${options.themes[1]}\u0000${options.code}`;
