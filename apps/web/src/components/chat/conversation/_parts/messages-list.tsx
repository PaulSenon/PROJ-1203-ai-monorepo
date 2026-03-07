import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  type AlwaysRenderConfig,
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { ChatMessage } from "@/components/chat/message/message";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  pendingAutoScrollTargetId?: string;
  onPendingAutoScrollTargetLayout?: (id: string) => void;
  onStartReached?: () => void;
  onEndReached?: () => void;
};

const ALWAYS_RENDER_CONFIG: AlwaysRenderConfig = {
  bottom: 2,
};

function SeparatorComponent() {
  return <div className="h-10" />;
}

function messageKeyExtractor(message: MyUIMessage) {
  return message.id;
}

function messageTypeExtractor(message: MyUIMessage) {
  return message.role;
}

export function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
  pendingAutoScrollTargetId,
  onPendingAutoScrollTargetLayout,
  onStartReached,
  onEndReached,
}: ConversationMessagesListProps) {
  const isReady = useRef(false);
  const consolidatedMessageIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<LegendListRef | null>(null);
  const messagesRef = useRef(messages);
  const handleStartReached = useCallback(() => {
    if (!isReady.current) return;
    onStartReached?.();
  }, [onStartReached]);
  const handleEndReached = useCallback(() => {
    if (!isReady.current) return;
    onEndReached?.();
  }, [onEndReached]);
  const { topRef, bottomRef } = useScrollEdges({
    onBottomReached: handleEndReached,
    onTopReached: handleStartReached,
    rootMargin: "100%",
  });

  messagesRef.current = messages;

  useEffect(() => {
    const currentMessageIds = new Set(messages.map((message) => message.id));

    consolidatedMessageIdsRef.current = new Set(
      [...consolidatedMessageIdsRef.current].filter((id) =>
        currentMessageIds.has(id)
      )
    );
  }, [messages]);

  const lastMessageId = messages.at(-1)?.id;
  const consolidatedMessageIds = useMemo(() => {
    const consolidatedIds = consolidatedMessageIdsRef.current;

    for (const message of messages) {
      const isStreamingLastAssistant =
        shouldReserveLastAssistantSpace &&
        message.role === "assistant" &&
        message.id === lastMessageId;

      if (!isStreamingLastAssistant) {
        consolidatedIds.add(message.id);
      }
    }

    return consolidatedIds;
  }, [lastMessageId, messages, shouldReserveLastAssistantSpace]);

  /**
   * Two little hacks here.
   * - we want initial scroll to be as window end, not list end
   * - we should only do that on "first layout but only when state is ready"
   */
  const handleLayout = useCallback(() => {
    // skip if we already did our initial scroll once
    if (isReady.current === true) return;
    // skip if internal list state not ready (meaning window height ready)
    if (listRef.current?.getState() === undefined) return;

    // perform real window end scroll
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    });
    isReady.current = true;
  }, [listRef.current?.getState]);

  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<MyUIMessage>) => {
      const isLast = index === messagesRef.current.length - 1;
      const shouldStreamMarkdown =
        isLast &&
        shouldReserveLastAssistantSpace &&
        item.role === "assistant" &&
        !consolidatedMessageIds.has(item.id);
      const shouldReserveForAssistant = shouldStreamMarkdown;

      return (
        <ConversationMessageRow
          consolidate={!shouldStreamMarkdown}
          enableCodeHighlighting={true}
          message={item}
          onPendingAutoScrollTargetLayout={onPendingAutoScrollTargetLayout}
          pendingAutoScrollTargetId={pendingAutoScrollTargetId}
          shouldReserveForAssistant={shouldReserveForAssistant}
        />
      );
    },
    [
      consolidatedMessageIds,
      onPendingAutoScrollTargetLayout,
      pendingAutoScrollTargetId,
      shouldReserveLastAssistantSpace,
    ]
  );

  if (messages.length === 0) return null;

  return (
    <>
      <ScrollEdgeProbe ref={topRef} />
      <LegendList<MyUIMessage>
        alignItemsAtEnd
        alwaysRender={ALWAYS_RENDER_CONFIG}
        data={messages}
        getItemType={messageTypeExtractor}
        ItemSeparatorComponent={SeparatorComponent}
        initialScrollAtEnd
        keyExtractor={messageKeyExtractor}
        maintainVisibleContentPosition
        onLayout={handleLayout}
        recycleItems
        ref={listRef}
        renderItem={renderItem}
        suggestEstimatedItemSize
        useWindowScroll
        waitForInitialLayout
      />
      <ScrollEdgeProbe ref={bottomRef} />
    </>
  );
}

type ConversationMessageRowProps = {
  message: MyUIMessage;
  shouldReserveForAssistant: boolean;
  consolidate: boolean;
  enableCodeHighlighting: boolean;
  pendingAutoScrollTargetId?: string;
  onPendingAutoScrollTargetLayout?: (id: string) => void;
};

const ConversationMessageRow = memo(function _ConversationMessageRow({
  message,
  shouldReserveForAssistant,
  consolidate,
  enableCodeHighlighting,
  pendingAutoScrollTargetId,
  onPendingAutoScrollTargetLayout,
}: ConversationMessageRowProps) {
  const shouldNotifyPendingAutoScroll =
    pendingAutoScrollTargetId === message.id &&
    onPendingAutoScrollTargetLayout !== undefined;

  useLayoutEffect(() => {
    if (!shouldNotifyPendingAutoScroll) return;

    onPendingAutoScrollTargetLayout(message.id);
  }, [message.id, onPendingAutoScrollTargetLayout, shouldNotifyPendingAutoScroll]);

  return (
    <div
      className={cn(shouldReserveForAssistant && "min-h-[calc(100vh-20rem)]")}
    >
      <ChatMessage
        consolidate={consolidate}
        enableCodeHighlighting={enableCodeHighlighting}
        message={message}
      />
    </div>
  );
});
