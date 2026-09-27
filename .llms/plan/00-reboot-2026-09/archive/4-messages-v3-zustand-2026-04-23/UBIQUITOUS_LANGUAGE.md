# Ubiquitous Language

## Chat conversation architecture

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Conversation Runtime** | React-land owner of hooks, lifecycle, and source binding for one mounted conversation. | Provider logic, bridge, manager |
| **Conversation Provider** | React context boundary that creates and exposes the view store for one mounted conversation. | Runtime |
| **Source Adapter** | React-land code that reads one hook/result and forwards it into the reconciler. | Collector, syncer |
| **Conversation Reconciler** | Pure TypeScript stateful engine that knows source precedence and computes merged patches. | Merge store, layer store |
| **Conversation View Store** | Scoped vanilla Zustand store containing only the merged UI-facing conversation state. | Main store, layer store |
| **Source** | One upstream truth contributor such as cache, persisted, optimistic, resumed, or http. | Layer |
| **Cold Source** | A source that usually updates by full snapshot replacement and changes infrequently. | Static layer |
| **Hot Source** | A source that usually represents the active streaming message and updates frequently. | Live layer |
| **Source Snapshot** | Full current truth for one cold source. Missing ids mean removal from that source. | Delta list |
| **Hot Slot** | Current truth for one hot source, represented by zero or one reconstructed message. | Hot layer state |
| **Winner Message** | The effective message chosen for one id after applying source precedence. | Final message |
| **Message Record** | Public normalized UI-facing record in the view store for one message id. | UI message state |
| **Ordered Ids** | Final visible message id list for rendering order. | Final list |
| **Status Snapshot** | UI-facing pending/loading/stale/streaming flags for the conversation. | Meta state |
| **Dirty Id** | A message id whose winner may have changed and must be reconsidered on next flush. | Changed id |
| **Flush** | One microtask-batched reconciliation pass that computes and applies one public patch. | Commit cycle |
| **View Patch** | One merged update payload applied to the view store in a single store write. | Patch |

## Relationships

- A **Conversation Runtime** owns exactly one **Conversation Reconciler** and one **Conversation View Store** per mounted conversation.
- A **Source Adapter** belongs to a **Conversation Runtime**.
- A **Conversation Reconciler** reads multiple **Sources** and computes **Winner Messages**.
- A **Conversation View Store** exposes only **Message Records**, **Ordered Ids**, and **Status Snapshot**.
- A **Dirty Id** is private reconciler state and never part of the public store.

## Example dialogue

> **Dev:** "When `persisted` updates, does the **Conversation View Store** keep that source?"
>
> **Domain expert:** "No. The **Conversation Reconciler** keeps source truth. The **Conversation View Store** only keeps **Winner Messages** as **Message Records**."
>
> **Dev:** "So when the HTTP stream ends, how do we fall back to persisted?"
>
> **Domain expert:** "The hot **Source Adapter** replaces the **Hot Slot** with `null`. On the next **Flush**, the **Conversation Reconciler** recomputes the **Winner Message** for that id and persisted wins."
>
> **Dev:** "And what triggers rerenders?"
>
> **Domain expert:** "Only the **View Patch** applied to the **Conversation View Store**. Components subscribe to `Ordered Ids`, `parts`, or `metadata` separately."

## Flagged ambiguities

- "store" was being used for both merge engine and UI subscription state. Recommendation: use **Conversation Reconciler** for merge logic and **Conversation View Store** for UI state.
- "layer" was being used for both source identity and merge precedence. Recommendation: use **Source**.
- "provider" and "bridge" were overloaded. Recommendation: **Conversation Provider** is the context boundary; **Conversation Runtime** is the full React-land orchestration inside it.
