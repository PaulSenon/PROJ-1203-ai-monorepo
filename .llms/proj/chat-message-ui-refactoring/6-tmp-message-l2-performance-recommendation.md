# TMP: Message L2 Performance Recommendation

> _Note: this file is NOT a specification file. Naming and file structure and implementation are just examples to describe the more global composition intention._

## 1. Context selectors pattern (if fine-grained updates needed)

```tsx
// Instead of one big context
const MessageContext = createContext<FullState>(...)
// Split into stable vs volatile
const MessageMetaContext = createContext<MetaState>(...)   // stable
const MessageStreamContext = createContext<StreamState>(...) // volatile
```

## 2. Children as props pattern (most important)

### BAD: Parent re-renders on stream → children re-render

```tsx
// BAD !!!
function MessageAssistant({ content }) {
  return (
    <Message.Root>
      <Message.Actions /> {/* Re-renders unnecessarily */}
      <StreamedContent content={content} />
    </Message.Root>
  );
}
```

### GOOD: Children are stable references

```tsx
// GOOD
function ChatMessage({ message }) {
  return (
    <Message.Provider value={...}>
      <MessageAssistant /> {/* Stable, doesn't re-render on stream */}
    </Message.Provider>
  );
}

function MessageAssistant() {
  // Actions doesn't re-render because MessageAssistant doesn't re-render
  return (
    <Message.Root>
      <Message.Actions />
      <StreamedContent /> {/* Gets content from context */}
    </Message.Root>
  );
}
```

## 3. Memo only at boundaries

```tsx
// Memo the streaming content component
const StreamedContent = memo(function StreamedContent() {
  const content = use(MessageStreamContext);
  return <Streamdown>{content}</Streamdown>;
});
```

> _Note: Don't memo everything else — composition handles it_
