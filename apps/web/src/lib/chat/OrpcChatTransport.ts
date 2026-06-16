import {
  defaultModelId,
  isAllowedModelId,
} from "@ai-monorepo/ai/model.registry";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import type { ChatTransport, UIMessage } from "ai";
import z from "zod";
import { chatRpc, isChatRPCError } from "@/utils/orpc/orpc";

type SendMessagesOptions<T extends UIMessage> = Parameters<
  ChatTransport<T>["sendMessages"]
>[0];
type ReconnectToStreamOptions<T extends UIMessage> = Parameters<
  ChatTransport<T>["reconnectToStream"]
>[0];

const sendMessageMetadataSchema = z.strictObject({
  selectedModelId: z.string().optional(),
  nextMessageId: z.string().optional(),
});

export class OrpcChatTransport implements ChatTransport<MyUIMessage> {
  async sendMessages(options: SendMessagesOptions<MyUIMessage>) {
    console.log("sendMessages", options);

    const optionsMetadata = sendMessageMetadataSchema.parse(
      options.metadata ?? {}
    );

    const lastMessage = options.messages.at(-1);
    if (!lastMessage) throw new Error("No message to send");

    const selectedModelId =
      optionsMetadata.selectedModelId ??
      lastMessage.metadata?.modelId ??
      defaultModelId;
    if (!isAllowedModelId(selectedModelId)) throw new Error("Invalid model ID");

    try {
      const iterator = await chatRpc.chat(
        {
          threadUuid: options.chatId,
          nextMessageUuid: optionsMetadata.nextMessageId,
          // messageUuid: options.messageId, //? not longer used ??
          lastMessageToKeep: lastMessage,
          trigger: options.trigger,
          selectedModelId,
        },
        { signal: options.abortSignal }
      );

      return eventIteratorToUnproxiedDataStream(iterator);
    } catch (error) {
      if (!isChatRPCError(error)) {
        throw new Error("Unknown Error thrown from chatRpc.chat", {
          cause: error,
        });
      }

      // TODO: typed RPC error handling

      // critical
      throw error;
    }
  }

  async reconnectToStream(
    _options: ReconnectToStreamOptions<MyUIMessage>
  ): Promise<null> {
    throw new Error("Unsupported");
  }
}
