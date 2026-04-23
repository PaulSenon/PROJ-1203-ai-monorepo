import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/providers/4-chat-session-scope", () => ({
  useChatSessionScope: () => ({
    isNew: false,
    sessionId: "thread-1",
  }),
}));

vi.mock("@/hooks/chat/use-ai-sdk-chat", () => ({
  useAiSdkChatActions: () => ({
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    setMessages: vi.fn(),
  }),
  useAiSdkChatHandlers: () => undefined,
  useAiSdkChatState: () => ({
    status: "ready",
  }),
}));

vi.mock("@/hooks/chat/use-chat-nav", () => ({
  useChatNavActions: () => ({
    persistNewChatIdToUrl: vi.fn(),
  }),
}));

vi.mock("@/hooks/queries/convex/utils/use-convex-mutation-0-auth", () => ({
  useCvxMutationAuthV3: () => vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/queries/use-chat-active-queries", () => ({
  useThread: () => ({
    data: {
      liveStatus: "pending",
    },
    isPending: false,
    isStale: true,
  }),
}));

vi.mock("@/hooks/use-chat-input", () => ({
  useChatInputActions: () => ({
    clear: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-stream-ownership", () => ({
  getLiveStatusKind: (status: string | undefined) => {
    if (status === "pending" || status === "streaming") return "ongoing";
    if (status === "completed" || status === "cancelled" || status === "error") {
      return "settled";
    }
    return "idle";
  },
  useStreamOwnership: () => ({
    isLocalOwned: false,
    markOwned: vi.fn(),
    clearOwnership: vi.fn(),
  }),
}));

vi.mock("@/lib/convex/queries", () => ({
  cvx: {
    mutationV3: {
      threads: {
        upsert: {
          options: () => ["mock-path", {}],
        },
      },
    },
  },
}));

vi.mock("./use-active-conversation-sources", () => ({
  useActiveConversationSourceState: () => ({
    cacheMessages: [],
    cacheSet: vi.fn().mockResolvedValue(undefined),
    httpMessage: null,
    isLoadingOlder: false,
    loadOlder: vi.fn(),
    olderHistoryStatus: "Exhausted",
    persistedMessages: [],
    resumedMessage: null,
    status: {
      isLoading: false,
      isPending: true,
      isStale: false,
      paginatedStatus: "Exhausted",
      streamingStatus: "ready",
    },
  }),
}));

import {
  useActiveConversationMessage,
  useActiveConversationMessageIds,
} from "./active-conversation-message-store";
import {
  useActiveConversationActions,
  useActiveConversationState,
} from "./active-conversation-store";
import {
  ActiveConversationProvider,
} from "./active-conversation-provider";

function StateProbe() {
  useActiveConversationState();
  return null;
}

function ActionsProbe() {
  useActiveConversationActions();
  return null;
}

function MessageIdsProbe() {
  useActiveConversationMessageIds();
  return null;
}

function MessageProbe() {
  useActiveConversationMessage("m1");
  return null;
}

function FullProbe() {
  const state = useActiveConversationState();
  const actions = useActiveConversationActions();
  const feed = useActiveConversationMessageIds();
  const message = useActiveConversationMessage("m1");

  return (
    <pre>
      {JSON.stringify({
        actionShapes: {
          cancel: typeof actions.cancel,
          regenerate: typeof actions.regenerate,
          sendMessage: typeof actions.sendMessage,
        },
        feed: {
          hasSnapshotGetter: typeof feed.getMessageSnapshot,
          isLoadingOlder: feed.isLoadingOlder,
          messageIds: feed.messageIds,
          olderHistoryStatus: feed.olderHistoryStatus,
        },
        messageIsUndefined: message === undefined,
        state: {
          isDataPending: state.isDataPending,
          isDataStale: state.isDataStale,
          isStreaming: state.isStreaming,
          isThreadSettled: state.isThreadSettled,
          pendingAutoScrollMessageId: state.pendingAutoScrollMessageId ?? null,
          streamStatus: state.streamStatus ?? null,
          uuid: state.uuid,
        },
      })}
    </pre>
  );
}

function decodeStaticMarkupJson(html: string) {
  const encodedJson = html.replace(/^<pre>|<\/pre>$/g, "");
  const json = encodedJson
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

  return JSON.parse(json) as {
    actionShapes: Record<string, string>;
    feed: {
      hasSnapshotGetter: string;
      isLoadingOlder: boolean;
      messageIds: string[];
      olderHistoryStatus: string;
    };
    messageIsUndefined: boolean;
    state: {
      isDataPending: boolean;
      isDataStale: boolean;
      isStreaming: boolean;
      isThreadSettled: boolean;
      pendingAutoScrollMessageId: string | null;
      streamStatus: string | null;
      uuid: string;
    };
  };
}

describe("use-active-conversation provider surfaces", () => {
  it("throws when state hook is used outside provider", () => {
    expect(() => renderToStaticMarkup(<StateProbe />)).toThrowError(
      "useActiveConversationState must be used within ActiveConversationProvider"
    );
  });

  it("throws when actions hook is used outside provider", () => {
    expect(() => renderToStaticMarkup(<ActionsProbe />)).toThrowError(
      "useActiveConversationActions must be used within ActiveConversationProvider"
    );
  });

  it("throws when message ids hook is used outside provider", () => {
    expect(() => renderToStaticMarkup(<MessageIdsProbe />)).toThrowError(
      "ActiveConversation message store must be used within ActiveConversationProvider"
    );
  });

  it("throws when single-message hook is used outside provider", () => {
    expect(() => renderToStaticMarkup(<MessageProbe />)).toThrowError(
      "ActiveConversation message store must be used within ActiveConversationProvider"
    );
  });

  it("exposes state, action, and feed surfaces through the provider", () => {
    const html = renderToStaticMarkup(
      <ActiveConversationProvider>
        <FullProbe />
      </ActiveConversationProvider>
    );
    const payload = decodeStaticMarkupJson(html);

    expect(payload.state.uuid).toBe("thread-1");
    expect(payload.state.streamStatus).toBe("pending");
    expect(payload.state.isDataPending).toBe(false);
    expect(payload.state.isDataStale).toBe(true);
    expect(payload.state.isStreaming).toBe(false);
    expect(payload.state.isThreadSettled).toBe(false);
    expect(payload.feed.messageIds).toEqual([]);
    expect(payload.feed.olderHistoryStatus).toBe("Exhausted");
    expect(payload.messageIsUndefined).toBe(true);
    expect(payload.actionShapes.sendMessage).toBe("function");
    expect(payload.actionShapes.cancel).toBe("function");
    expect(payload.actionShapes.regenerate).toBe("function");
  });
});
