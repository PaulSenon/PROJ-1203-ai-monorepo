import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

export function makeTextPart(text: string): MyUIMessage["parts"][number] {
  return {
    type: "text",
    text,
    state: "done",
  } satisfies Extract<MyUIMessage["parts"][number], { type: "text" }>;
}

export function makeReasoningPart(
  text: string
): MyUIMessage["parts"][number] {
  return {
    type: "reasoning",
    text,
    state: "done",
  } satisfies Extract<MyUIMessage["parts"][number], { type: "reasoning" }>;
}

export function makeMetadata(
  overrides: Partial<MyUIMessageMetadata> = {}
): MyUIMessageMetadata {
  return {
    createdAt: 1,
    updatedAt: 1,
    liveStatus: "completed",
    lifecycleState: "active",
    ...overrides,
  } satisfies MyUIMessageMetadata;
}

export function makeUserMessage(
  overrides: Partial<MyUIMessage> = {}
): MyUIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [makeTextPart("hello")],
    metadata: makeMetadata(),
    ...overrides,
  } satisfies MyUIMessage;
}

export function makeAssistantMessage(
  overrides: Partial<MyUIMessage> = {}
): MyUIMessage {
  return {
    id: "assistant-1",
    role: "assistant",
    parts: [makeTextPart("hi")],
    metadata: makeMetadata(),
    ...overrides,
  } satisfies MyUIMessage;
}
