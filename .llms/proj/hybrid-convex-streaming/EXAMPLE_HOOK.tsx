/**
 * Example implementation of a React hook that combines all three message reading patterns:
 * 1. REST (paginated) - finalized messages
 * 2. HTTP streaming - messages initiated by this browser via useChat
 * 3. Resumed streaming - ongoing streams from other sources
 * 
 * This is a reference implementation based on the Convex Agents architecture.
 */

import { useMemo } from "react";
import { usePaginatedQuery } from "convex-helpers/react";
import type { FunctionReference, PaginationOptions, PaginationResult } from "convex/server";
import type { UIMessage, UIStatus } from "./src/UIMessages";
import { combineUIMessages, dedupeMessages } from "./src/UIMessages";
import { sorted } from "./src/shared";
import { useStreamingUIMessages } from "./src/react/useStreamingUIMessages";
import type { StreamQuery, StreamQueryArgs } from "./src/react/types";

/**
 * Type for a query that returns paginated UIMessages with optional streaming support
 */
type MessagesQuery = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    paginationOpts: PaginationOptions;
    streamArgs?: any; // StreamArgs from validators
  },
  PaginationResult<UIMessage> & { streams?: any } // SyncStreamsReturnValue
>;

type MessagesQueryArgs = Omit<
  Parameters<MessagesQuery>[0],
  "paginationOpts" | "streamArgs"
>;

/**
 * Hook options
 */
type UseMessagesOptions = {
  /**
   * Initial number of items to load
   */
  initialNumItems: number;
  
  /**
   * Whether to enable streaming (resumed streams)
   * Default: false
   */
  stream?: boolean;
  
  /**
   * Stream ID from HTTP streaming (useChat) to exclude from delta queries
   * When a message is streamed via HTTP, pass its streamId here to avoid
   * double-fetching it via delta queries
   */
  httpStreamId?: string;
  
  /**
   * Additional stream IDs to skip (e.g., multiple HTTP streams)
   */
  skipStreamIds?: string[];
};

/**
 * Result type matching usePaginatedQuery
 */
type UseMessagesResult = {
  results: UIMessage[];
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";
  loadMore: (numItems?: number) => void;
};

/**
 * Main hook that combines all three reading patterns
 * 
 * @param query - The Convex query that returns paginated messages and optionally streams
 * @param args - Query arguments (excluding paginationOpts and streamArgs)
 * @param options - Hook options
 * @returns Paginated messages with streaming support
 * 
 * @example
 * ```tsx
 * // Simple usage (REST only)
 * const { results, loadMore } = useMessages(
 *   api.messages.list,
 *   { threadId },
 *   { initialNumItems: 10 }
 * );
 * 
 * @example
 * ```tsx
 * // With streaming enabled
 * const { results } = useMessages(
 *   api.messages.list,
 *   { threadId },
 *   { 
 *     initialNumItems: 10,
 *     stream: true
 *   }
 * );
 * 
 * @example
 * ```tsx
 * // With HTTP streaming (useChat)
 * const { messages, append } = useChat({ api: '/api/chat' });
 * const currentStreamId = getStreamIdFromChat(messages);
 * 
 * const { results } = useMessages(
 *   api.messages.list,
 *   { threadId },
 *   { 
 *     initialNumItems: 10,
 *     stream: true,
 *     httpStreamId: currentStreamId // Exclude HTTP-streamed message
 *   }
 * );
 * ```
 */
export function useMessages(
  query: MessagesQuery,
  args: MessagesQueryArgs | "skip",
  options: UseMessagesOptions
): UseMessagesResult {
  const {
    initialNumItems,
    stream = false,
    httpStreamId,
    skipStreamIds = [],
  } = options;

  // ============================================
  // PATTERN 1: REST (Paginated Query)
  // ============================================
  // Fetches finalized messages from the database
  const paginated = usePaginatedQuery(
    query,
    args === "skip" ? "skip" : args,
    { initialNumItems }
  );

  // Calculate the minimum order from paginated results
  // This helps determine where to start looking for streaming messages
  const startOrder = useMemo(() => {
    if (paginated.results.length === 0) return 0;
    return Math.min(...paginated.results.map((m) => m.order));
  }, [paginated.results]);

  // Combine skipStreamIds (HTTP stream + any additional ones)
  const allSkipStreamIds = useMemo(() => {
    const ids = [...skipStreamIds];
    if (httpStreamId) {
      ids.push(httpStreamId);
    }
    return ids.length > 0 ? ids : undefined;
  }, [httpStreamId, skipStreamIds]);

  // ============================================
  // PATTERN 3: Resumed Streaming (Delta Queries)
  // ============================================
  // Fetches ongoing streams via delta queries
  // This is skipped if:
  // - Streaming is disabled
  // - Args are "skip"
  // - Still loading first page (to avoid race conditions)
  const streamMessages = useStreamingUIMessages(
    query as StreamQuery<MessagesQueryArgs>,
    !stream ||
      args === "skip" ||
      paginated.status === "LoadingFirstPage"
      ? "skip"
      : ({ ...args, paginationOpts: { cursor: null, numItems: 0 } } as StreamQueryArgs<any>),
    {
      startOrder,
      skipStreamIds: allSkipStreamIds,
    }
  );

  // ============================================
  // Merge and Deduplicate
  // ============================================
  // Combine paginated messages (may be split across pages)
  // and streaming messages, then deduplicate by (order, stepOrder)
  const merged = useMemo(() => {
    // Combine messages that may have been split by pagination
    const combined = combineUIMessages(sorted(paginated.results));
    
    // Deduplicate with streaming messages
    return dedupeMessages(combined, streamMessages ?? []);
  }, [paginated.results, streamMessages]);

  return {
    ...paginated,
    results: merged,
  };
}

/**
 * Helper function to extract stream ID from useChat messages
 * This is a placeholder - implement based on your useChat setup
 */
function getStreamIdFromChat(messages: any[]): string | undefined {
  // Find the last streaming message and extract its streamId
  // This depends on how you structure your useChat messages
  // Example implementation:
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.status === "streaming" && lastMessage?.id?.startsWith("stream:")) {
    return lastMessage.id.replace("stream:", "");
  }
  return undefined;
}

/**
 * Example usage with useChat integration
 */
export function ExampleUsageWithUseChat() {
  const threadId = "thread_123";
  
  // HTTP streaming via useChat (Pattern 2)
  // This handles messages initiated by this browser
  const { messages: chatMessages, append } = useChat({
    api: "/api/chat",
    body: { threadId },
    onFinish: (message) => {
      // Message is saved to Convex, will appear in paginated query
      console.log("Message finished:", message);
    },
  });

  // Extract stream ID from HTTP stream
  const httpStreamId = useMemo(() => {
    return getStreamIdFromChat(chatMessages);
  }, [chatMessages]);

  // Combined hook (Patterns 1 & 3)
  // Pattern 1: Paginated finalized messages
  // Pattern 3: Resumed streams (excluding HTTP stream)
  const { results, loadMore, status } = useMessages(
    api.messages.listThreadMessages,
    { threadId },
    {
      initialNumItems: 10,
      stream: true, // Enable resumed streaming
      httpStreamId, // Exclude HTTP-streamed message from delta queries
    }
  );

  // Merge HTTP stream messages with query results
  // The HTTP stream provides real-time updates for initiated messages
  // The query provides all other messages (finalized + resumed streams)
  const allMessages = useMemo(() => {
    // Combine chatMessages (HTTP stream) with query results
    // Deduplicate by message key
    const messageMap = new Map<string, UIMessage>();
    
    // Add query results first
    results.forEach((msg) => {
      messageMap.set(msg.key, msg);
    });
    
    // Add/update with HTTP stream messages (they take precedence for their streamId)
    chatMessages.forEach((msg) => {
      if (msg.status === "streaming" || msg.status === "pending") {
        messageMap.set(msg.key, msg as UIMessage);
      }
    });
    
    return sorted(Array.from(messageMap.values()));
  }, [results, chatMessages]);

  return {
    messages: allMessages,
    loadMore,
    status,
    sendMessage: append,
  };
}

/**
 * Simplified version for REST-only usage
 */
export function useMessagesRestOnly(
  query: MessagesQuery,
  args: MessagesQueryArgs | "skip",
  options: { initialNumItems: number }
) {
  return useMessages(query, args, {
    ...options,
    stream: false, // Disable streaming
  });
}

/**
 * Simplified version for streaming-only usage
 */
export function useMessagesStreamingOnly(
  query: MessagesQuery,
  args: MessagesQueryArgs | "skip",
  options: {
    initialNumItems: number;
    skipStreamIds?: string[];
  }
) {
  return useMessages(query, args, {
    ...options,
    stream: true, // Enable streaming
  });
}

// Type imports (these would come from your actual implementation)
declare const api: { messages: { listThreadMessages: MessagesQuery } };
declare function useChat(options: any): { messages: any[]; append: (message: any) => void };

