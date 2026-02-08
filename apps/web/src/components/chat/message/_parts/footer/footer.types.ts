import type { MaybePromise } from "@/lib/utils";

export type MessageCopySource = "raw-text";

export type MessageFooterActionPayload =
  | { type: "copy"; source: MessageCopySource }
  | { type: "retry"; modelId?: string }
  | { type: "edit-retry"; text: string };

export type MessageFooterActionResult = MaybePromise<undefined | boolean>;

export type MessageFooterActionHandler = (
  payload: MessageFooterActionPayload
) => MessageFooterActionResult;
