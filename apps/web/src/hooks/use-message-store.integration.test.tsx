// @vitest-environment jsdom

import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { act, memo } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  MessagesStoreProvider,
  useMessageMetadata,
  useMessageParts,
} from "./use-message-store";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

function createMessage(
  id: string,
  options?: Partial<MyUIMessage>
): MyUIMessage {
  const createdAt = Number(id) * 100;

  return {
    id,
    role: options?.role ?? "assistant",
    metadata: {
      createdAt,
      updatedAt: createdAt,
      liveStatus: "completed",
      lifecycleState: "active",
      ...options?.metadata,
    },
    parts: options?.parts ?? [{ type: "text", text: `message-${id}` }],
  };
}

describe("MessagesStoreProvider reactive slice boundaries", () => {
  it("metadata-only updates rerender metadata subscribers without rerendering parts subscribers", async () => {
    const metadataRenders: Array<number | undefined> = [];
    const partsRenders: string[] = [];

    const MetadataProbe = memo(function MetadataProbe({
      messageId,
    }: {
      messageId: string;
    }) {
      const metadata = useMessageMetadata(messageId);
      metadataRenders.push(metadata?.updatedAt);
      return null;
    });

    const PartsProbe = memo(function PartsProbe({
      messageId,
    }: {
      messageId: string;
    }) {
      const parts = useMessageParts(messageId) ?? [];
      partsRenders.push(JSON.stringify(parts));
      return null;
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <MessagesStoreProvider
            messages={[
              createMessage("1", {
                metadata: {
                  createdAt: 100,
                  updatedAt: 100,
                  liveStatus: "streaming",
                  lifecycleState: "active",
                  debug: { dataSource: "http-stream" },
                },
                parts: [{ type: "text", text: "hello" }],
              }),
            ]}
          >
            <MetadataProbe messageId="1" />
            <PartsProbe messageId="1" />
          </MessagesStoreProvider>
        );
      });

      await act(async () => {
        root.render(
          <MessagesStoreProvider
            messages={[
              createMessage("1", {
                metadata: {
                  createdAt: 100,
                  updatedAt: 101,
                  liveStatus: "completed",
                  lifecycleState: "active",
                  modelId: "model-b",
                },
                parts: [{ type: "text", text: "hello" }],
              }),
            ]}
          >
            <MetadataProbe messageId="1" />
            <PartsProbe messageId="1" />
          </MessagesStoreProvider>
        );
      });

      expect(metadataRenders).toEqual([100, 101]);
      expect(partsRenders).toEqual(['[{"type":"text","text":"hello"}]']);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("parts-only updates rerender parts subscribers without rerendering metadata subscribers", async () => {
    const metadataRenders: Array<number | undefined> = [];
    const partsRenders: string[] = [];

    const MetadataProbe = memo(function MetadataProbe({
      messageId,
    }: {
      messageId: string;
    }) {
      const metadata = useMessageMetadata(messageId);
      metadataRenders.push(metadata?.updatedAt);
      return null;
    });

    const PartsProbe = memo(function PartsProbe({
      messageId,
    }: {
      messageId: string;
    }) {
      const parts = useMessageParts(messageId) ?? [];
      partsRenders.push(JSON.stringify(parts));
      return null;
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <MessagesStoreProvider
            messages={[
              createMessage("1", {
                metadata: {
                  createdAt: 100,
                  updatedAt: 100,
                  liveStatus: "completed",
                  lifecycleState: "active",
                },
                parts: [{ type: "text", text: "hello" }],
              }),
            ]}
          >
            <MetadataProbe messageId="1" />
            <PartsProbe messageId="1" />
          </MessagesStoreProvider>
        );
      });

      await act(async () => {
        root.render(
          <MessagesStoreProvider
            messages={[
              createMessage("1", {
                metadata: {
                  createdAt: 100,
                  updatedAt: 101,
                  liveStatus: "completed",
                  lifecycleState: "active",
                  debug: { dataSource: "http-stream" },
                },
                parts: [{ type: "text", text: "hello world" }],
              }),
            ]}
          >
            <MetadataProbe messageId="1" />
            <PartsProbe messageId="1" />
          </MessagesStoreProvider>
        );
      });

      expect(metadataRenders).toEqual([100]);
      expect(partsRenders).toEqual([
        '[{"type":"text","text":"hello"}]',
        '[{"type":"text","text":"hello world"}]',
      ]);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
