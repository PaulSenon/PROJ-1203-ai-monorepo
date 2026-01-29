# Message Component I/O

This document frames the work inside the bigger mental model of this project.

## Input Types

The L3 message component receives a custom UIMessage typed object with optional metadata:

```typescript
type MyUIMessageMetadata = {
  modelId: string;
  updatedAt: number;
  createdAt: number;
  sentAt: number;
  liveStatus: LiveStatus; // pending, streaming, completed, error, cancelled
  lifecycleState: LifecycleState; // active, archived, deleted
  error: MessageError;
  timing: MyUIMessageTimingStats;
  usage: MyUIMessageTokenUsage;
};

type MessageError =
  | {
      kind: "AI_API_ERROR";
      params: {
        reason: string;
        retryWithSuggestedModelIds: string[];
      };
    }
  | {
      kind: "UNKNOWN_ERROR";
      params: {
        reason: string;
      };
    }
  | {
      kind: "MAX_OUTPUT_TOKENS_EXCEEDED";
      params: {
        maxOutputTokens: number;
        retryWithSuggestedModelIds: string[];
      };
    };

type MyUIMessageTimingStats = {
  userSubmittedAt?: number;
  firstThinkingTokenReceivedAt?: number;
  firstContentTokenReceivedAt?: number;
  firstTokenReceivedAt?: number;
  lastTokenReceivedAt?: number;
  lastContentTokenReceivedAt?: number;
  lastThinkingTokenReceivedAt?: number;
};

type MyUIMessageTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};
```

The actual implementation may differ slightly. The goal is clean metadata primitives that enable easy UI building. Working with mocks for now.

## App State and Actions

L3 has access to app state and actions via hooks. Will need at minimum:
- Actions from `use-chat-active.tsx` for retry
- Chat actions object with retry, retryWithModel, continue, copy, branch

## Performance Requirements

Message parts change A LOT during streaming (multiple times per second). Design for:
- Only reasoning and text parts should rerender on every change
- ai-elements/streamdown heavily memoizes each markdown block (FYI)
- Actions and heavy UI should rerender granularly

### Expected Behaviors

- Copy action button: Rendered once, never rerenders. Content snapshot happens on click.
- Token per second stat: Reacts only to MyUIMessageTimingStats changes.
- General rule: Defer any reaction to state with no direct visual impact.

## L3 Usage Pattern

The L3 component composes L2 and binds to app state:

```tsx
// L3: apps/web/src/components/chat/chat-message.tsx

import { Message } from "@/components/ui-custom/chat/message";

export function ChatMessage({ message }: { message: MyUIMessage }) {
  const actions = useChatActions();

  return (
    <Message.Provider
      state={{
        content: extractContent(message),
        reasoning: extractReasoning(message),
        isStreaming: message.metadata?.liveStatus === "streaming",
        owner: message.role,
      }}
      actions={{
        onRetry: () => actions.retry(message.id),
        onRetryWithModel: (modelId) => actions.retryWithModel(message.id, modelId),
        onContinue: () => actions.continue(message.id),
        onCopy: () => copyToClipboard(message),
        onBranch: () => actions.branch(message.id),
      }}
      meta={{
        timing: message.metadata?.timing,
        usage: message.metadata?.usage,
      }}
    >
      <Message.Root>
        <Message.Reasoning />
        <Message.Content />
        <Message.Status />
        <Message.Footer>
          <Message.Actions>
            <Message.Action tooltip="Copy" onClick={...}>
              <CopyIcon />
            </Message.Action>
          </Message.Actions>
          <Message.Stats />
        </Message.Footer>
      </Message.Root>
    </Message.Provider>
  );
}
```

This pattern separates:
- L2 (Message.*): Pure UI composition, no app knowledge
- L3 (ChatMessage): App state binding, type mapping, action wiring
