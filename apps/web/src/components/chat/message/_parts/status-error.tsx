import type {
  MessageError,
  MessageErrorKind,
} from "@ai-monorepo/ai/types/uiMessage";
import { StatusBlock } from "@/components/ui-custom/feedback/status-block";
import {
  type StatusActionDescriptor,
  StatusActionList,
  type StatusActionPayload,
} from "./status-actions";

const UNKNOWN_ERROR_TITLE = "Unknown Error";
const UNKNOWN_ERROR_BODY = "Sorry for the inconvenience.";

const errorTitleByKind: Record<MessageErrorKind, string> = {
  AI_API_ERROR: "AI Provider Error",
  UNKNOWN_ERROR: UNKNOWN_ERROR_TITLE,
  MAX_OUTPUT_TOKENS_EXCEEDED: "Max output tokens exceeded",
};

const errorBodyByKind: Record<MessageErrorKind, string> = {
  AI_API_ERROR: "Please retry with another model.",
  UNKNOWN_ERROR: UNKNOWN_ERROR_BODY,
  MAX_OUTPUT_TOKENS_EXCEEDED: "Please retry with another model.",
};

const defaultErrorActions: StatusActionDescriptor[] = [
  {
    id: "retry",
    label: "Retry",
    intent: "primary",
    payload: { type: "retry" },
  },
  {
    id: "retry-another-model",
    label: "Retry with another model",
    intent: "secondary",
    payload: { type: "retry-model" },
  },
];

const errorActionComponentMap: {
  [K in MessageErrorKind]: (
    error: Extract<MessageError, { kind: K }>
  ) => StatusActionDescriptor[];
} = {
  AI_API_ERROR: () => defaultErrorActions,
  UNKNOWN_ERROR: () => defaultErrorActions,
  MAX_OUTPUT_TOKENS_EXCEEDED: (error) => {
    const suggestedModelId = error.params?.retryWithSuggestedModelIds?.[0];

    if (suggestedModelId) {
      return [
        {
          id: "retry-suggested-model",
          label: "Retry with suggested model",
          intent: "primary",
          payload: { type: "retry-model", modelId: suggestedModelId },
        },
        {
          id: "retry-different-model",
          label: "Retry with different model",
          intent: "secondary",
          payload: { type: "retry-model" },
        },
      ];
    }

    return [
      {
        id: "retry",
        label: "Retry",
        intent: "primary",
        payload: { type: "retry" },
      },
    ];
  },
};

function getErrorActions(
  error: MessageError | undefined
): StatusActionDescriptor[] {
  if (!error) {
    return errorActionComponentMap.UNKNOWN_ERROR({ kind: "UNKNOWN_ERROR" });
  }

  if (error.kind === "AI_API_ERROR") {
    return errorActionComponentMap.AI_API_ERROR(error);
  }

  if (error.kind === "MAX_OUTPUT_TOKENS_EXCEEDED") {
    return errorActionComponentMap.MAX_OUTPUT_TOKENS_EXCEEDED(error);
  }

  return errorActionComponentMap.UNKNOWN_ERROR(error);
}

function getErrorContent(error: MessageError | undefined) {
  // Keep UI copy controlled by kind mapping; do not surface raw error.message.
  if (!error) {
    return { title: UNKNOWN_ERROR_TITLE, body: UNKNOWN_ERROR_BODY };
  }

  const title = errorTitleByKind[error.kind] ?? UNKNOWN_ERROR_TITLE;
  const fallbackBody = errorBodyByKind[error.kind] ?? UNKNOWN_ERROR_BODY;

  if (error.kind === "MAX_OUTPUT_TOKENS_EXCEEDED") {
    const segments = [fallbackBody];
    const maxTokens = error.params?.maxOutputTokens;
    const suggestedModelIds =
      error.params?.retryWithSuggestedModelIds?.filter(Boolean);

    if (typeof maxTokens === "number") {
      segments.push(`Max output limit: ${maxTokens} tokens.`);
    }

    if (suggestedModelIds?.length) {
      segments.push(`Suggested models: ${suggestedModelIds.join(", ")}.`);
    }

    return { title, body: segments.join(" ") };
  }

  return { title, body: fallbackBody };
}

type ErrorStatusPartProps = {
  error?: MessageError;
  onAction: (payload: StatusActionPayload) => void;
};

export function ErrorStatusPart({ error, onAction }: ErrorStatusPartProps) {
  const { title, body } = getErrorContent(error);
  const actions = getErrorActions(error);

  return (
    <StatusBlock.Root className="w-full" kind="error">
      <StatusBlock.Content>
        <StatusBlock.Title>{title}</StatusBlock.Title>
        <StatusBlock.Body>{body}</StatusBlock.Body>
      </StatusBlock.Content>
      <StatusBlock.Actions>
        <StatusActionList actions={actions} onAction={onAction} />
      </StatusBlock.Actions>
    </StatusBlock.Root>
  );
}
