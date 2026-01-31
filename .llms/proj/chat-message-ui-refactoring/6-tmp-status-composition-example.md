# TMP: Status Composition Example

> _Note: this file is NOT a specification file. Naming and file structure and implementation are just examples to describe the more global composition intention._

L2: `ui-custom/feedback/status-block.tsx` ← Generic status block compound
L3: `chat/message/\_parts/status.tsx` ← Part that adapts StatusBlock for messages
The `\_parts/status.tsx` composes L2 `StatusBlock.\*` and handles the mapping:

```tsx
// chat/message/_parts/status.tsx
export function MessageStatus({ message }: { message: MyUIMessage }) {
  if (message.status === 'error') {
    return (
      <StatusBlock.Root kind="error">
        <StatusBlock.Icon />
        <StatusBlock.Title>{getErrorTitle(message.error)}</StatusBlock.Title>
        <StatusBlock.Content>{getErrorMessage(message.error)}</StatusBlock.Content>
        <StatusBlock.Actions>
          {/* L3 wires the callbacks */}
          <StatusBlock.Action onClick={...}>Retry</StatusBlock.Action>
        </StatusBlock.Actions>
      </StatusBlock.Root>
    );
  }

  if (message.status === 'cancelled') {
    return (
      <StatusBlock.Root kind="warning">
        <StatusBlock.Icon />
        <StatusBlock.Title>Cancelled</StatusBlock.Title>
      </StatusBlock.Root>
    );
  }

  return null;
}
```

Then in the message variant:

```tsx
// chat/message/message-assistant.tsx
export function ChatMessageAssistant() {
  return (
    <Message.Root>
      <MessageStatus /> {/* Part handles error/cancelled */}
      <Message.Content>
        <AssistantReasoning />
        <StreamedContent />
      </Message.Content>
      <AssistantFooter />
    </Message.Root>
  );
}
```
