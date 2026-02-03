import type {
  MessageError,
  MessageErrorKind,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { StatusBlock } from "@/components/ui-custom/feedback/status-block";

export type StatusPartProps = {
  metadata?: MyUIMessageMetadata;
};

const CANCELLED_TITLE = "Cancelled";
const CANCELLED_BODY = "Response cancelled.";
const DEFAULT_ERROR_TITLE = "Error";
const DEFAULT_ERROR_BODY = "Something went wrong.";

const errorTitleByKind: Record<MessageErrorKind, string> = {
  AI_API_ERROR: "Provider error",
  UNKNOWN_ERROR: "Error",
  MAX_OUTPUT_TOKENS_EXCEEDED: "Response limit reached",
};

const errorBodyByKind: Record<MessageErrorKind, string> = {
  AI_API_ERROR: "The provider returned an error.",
  UNKNOWN_ERROR: DEFAULT_ERROR_BODY,
  MAX_OUTPUT_TOKENS_EXCEEDED: "Max output tokens exceeded.",
};

function getErrorContent(error: MessageError | undefined) {
  if (!error) {
    return { title: DEFAULT_ERROR_TITLE, body: DEFAULT_ERROR_BODY };
  }

  const title = errorTitleByKind[error.kind] ?? DEFAULT_ERROR_TITLE;
  const fallbackBody = errorBodyByKind[error.kind] ?? DEFAULT_ERROR_BODY;
  const message = error.message?.trim();

  if (message) {
    return { title, body: message };
  }

  if (error.kind === "MAX_OUTPUT_TOKENS_EXCEEDED" && "params" in error) {
    const maxTokens = error.params?.maxOutputTokens;
    if (maxTokens) {
      return { title, body: `Max output tokens exceeded (${maxTokens}).` };
    }
  }

  return { title, body: fallbackBody };
}

type ErrorStatusPartProps = {
  error?: MessageError;
};

function ErrorStatusPart({ error }: ErrorStatusPartProps) {
  const { title, body } = getErrorContent(error);

  return (
    <StatusBlock.Root
      aria-live="polite"
      className="w-full"
      kind="error"
      role="status"
    >
      <StatusBlock.Content>
        <StatusBlock.Title>{title}</StatusBlock.Title>
        <StatusBlock.Body>{body}</StatusBlock.Body>
      </StatusBlock.Content>
    </StatusBlock.Root>
  );
}

function CancelledStatusPart() {
  return (
    <StatusBlock.Root
      aria-live="polite"
      className="w-full"
      kind="warning"
      role="status"
    >
      <StatusBlock.Content>
        <StatusBlock.Title>{CANCELLED_TITLE}</StatusBlock.Title>
        <StatusBlock.Body>{CANCELLED_BODY}</StatusBlock.Body>
      </StatusBlock.Content>
    </StatusBlock.Root>
  );
}

export function StatusPart({ metadata }: StatusPartProps) {
  const isError = metadata?.liveStatus === "error" || Boolean(metadata?.error);
  const isCancelled = metadata?.liveStatus === "cancelled";

  if (isError) return <ErrorStatusPart error={metadata?.error} />;
  if (isCancelled) return <CancelledStatusPart />;
  return null;
}
