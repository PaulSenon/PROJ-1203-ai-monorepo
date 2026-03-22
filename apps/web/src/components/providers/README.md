# Providers groups

We group providers in stack for each lifetime granularity of the app:

```txt
- app-root-scope (app root, stable)
  - user-scope (resets when user changes)
    - chat-app-root-scope (chat-app root, stable while in chat part of app)
      - chat-workspace-scope (resets when workspace changes)
        - chat-session-scope (resets when session changes)
```

## `app-root-scope` lifetime

The root lifetime, that initialize once at first load, and provide all global contexts (like auth, convex, tanstack query etc)

## `user-scope` lifetime

## `chat-app-root-scope` lifetime

## `chat-workspace-scope` lifetime

The chat-workspace lifetime, this in only for chat scope (e.g. if in future we have other pages or multi workspaces) but remain stable when navigating inside the chat app.

Intended context wrapper use:

```tsx
// this expects to we wrapped with proper context provider to infer workspace from.
<ChatWorkspaceScopeFromRouter>
  {/* everything scoped to workspace lifetime */}
</ChatWorkspaceScopeFromRouter>
```

Manual use:

```tsx
// this is if you want to manually provide the workspace state
<ChatWorkspaceScope workspaceId={youWorkspaceId}>
  {/* everything scoped to workspace lifetime */}
</ChatWorkspaceScope>
```

To manually add a new workspace scoped context provider modify `ChatWorkspaceScopeExternalProviders`:

```tsx
function ChatWorkspaceScopeExternalProviders({ children, workspaceId }) {
  return (
    <YourProviderA>
      {/* you have access to workspaceId if needed */}
      <YourProviderB workspaceId={workspaceId}>
        {/* ... more providers */}
        {children}
        {/* ... */}
      </YourProviderB>
    </YourProviderA>
  );
}
```

Then anything wrapped under `ChatWorkspaceScopeFromRouter` (or `ChatWorkspaceScope`) **including your custom external providers** have access to the workspace context with:

```tsx
const { workspaceId } = useChatWorkspaceScope();
```

> [!NOTE]
> All your external providers registered in ChatWorkspaceScopeExternalProviders are keyed by workspaceId.
> Therefore they will be remounted on workspaceId change. (reset)

## `chat-session-scope` lifetime

The contexts only bound to a specific `threadUuid`, will handle thread messages, streaming, draft, etc.
