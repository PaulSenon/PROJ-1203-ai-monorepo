import type { MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import { CancelledStatusPart } from "./status-cancelled";
import { ErrorStatusPart } from "./status-error";

export type StatusPartProps = {
  metadata?: MyUIMessageMetadata;
};

export function StatusPart({ metadata }: StatusPartProps) {
  const isCancelled = metadata?.liveStatus === "cancelled";
  const isError = metadata?.liveStatus === "error" || Boolean(metadata?.error);

  if (isCancelled) return <CancelledStatusPart />;
  if (isError) return <ErrorStatusPart error={metadata?.error} />;
  return null;
}
