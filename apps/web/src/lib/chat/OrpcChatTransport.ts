import {
  defaultModelId,
  isAllowedModelId,
} from "@ai-monorepo/ai/model.registry";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import type { ChatTransport, UIMessage } from "ai";
import z from "zod";
import { chatRpc } from "@/utils/orpc/orpc";

type SendMessagesOptions<T extends UIMessage> = Parameters<
  ChatTransport<T>["sendMessages"]
>[0];
type ReconnectToStreamOptions<T extends UIMessage> = Parameters<
  ChatTransport<T>["reconnectToStream"]
>[0];

const sendMessageMetadataSchema = z.object({
  selectedModelId: z.string().optional(),
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
    return eventIteratorToUnproxiedDataStream(
      await chatRpc.chat(
        {
          threadUuid: options.chatId,
          messageUuid: options.messageId,
          lastMessageToKeep: lastMessage,
          trigger: options.trigger,
          selectedModelId,
        },
        { signal: options.abortSignal }
      )
    );
  }

  async reconnectToStream(
    _options: ReconnectToStreamOptions<MyUIMessage>
  ): Promise<null> {
    throw new Error("Unsupported");
  }
}
