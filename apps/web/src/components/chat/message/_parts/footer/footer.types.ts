import type { MaybePromise } from "@/lib/utils";

export type MessageCopySource = "raw-text";

export type MessageFooterActionPayload = {
  type: "copy";
  source: MessageCopySource;
};

export type MessageFooterActionResult = MaybePromise<undefined | boolean>;

export type MessageFooterActionHandler = (
  payload: MessageFooterActionPayload
) => MessageFooterActionResult;
