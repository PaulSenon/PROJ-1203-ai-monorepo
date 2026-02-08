import type { MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import type { StatusActionPayload } from "./_parts/status-actions";
import { CancelledStatusPart } from "./status-cancelled";
import { ErrorStatusPart } from "./status-error";

export type StatusPartProps = {
  metadata?: MyUIMessageMetadata;
  onAction: (payload: StatusActionPayload) => void;
};

export function StatusPart({ metadata, onAction }: StatusPartProps) {
  const isCancelled = metadata?.liveStatus === "cancelled";
  const isError = metadata?.liveStatus === "error" || Boolean(metadata?.error);

  if (isCancelled) return <CancelledStatusPart onAction={onAction} />;
  if (isError)
    return <ErrorStatusPart error={metadata?.error} onAction={onAction} />;
  return null;
}
