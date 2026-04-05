# Providers groups

We group providers in stack for each lifetime granularity of the app

```txt
- 0-app-root-scope (app root, stable)
  - 1-user-scope (resets when user changes)
    - 2-chat-app-root-scope (chat-app root, stable while in chat part of app (/chat/*))
      - 3-chat-workspace-scope (resets when workspace changes (workspaces not implemented yet))
        - 4-chat-session-scope (resets when session changes)
```

## `0-app-root-scope` lifetime

Initialize once at first load, and provide all global contexts (like auth, convex, tanstack query etc) that never need to be reset.

Usage :

```tsx
<AppRootScope>{/* everything needed everywhere */}</AppRootScope>
```

To manually add a new global scoped context provider modify `AppRootScopeExternalProviders`:

```tsx
function AppRootScopeExternalProviders({ children }) {
  return (
    <YourProviderA>
      <YourProviderB>
        {/* ... more providers */}
        {children}
        {/* ... */}
      </YourProviderB>
    </YourProviderA>
  );
}
```

> [!NOTE]
> This is a stable scope. I will never trigger any rerender. And it doesn't hold any states.
> As it's the root scope it mounted once a app hydration and never unmounted.

## `1-user-scope` lifetime

All the user scoped context, like cache, preferences etc. They will be reset when user changes (logout, login, change)

Convenient context wrapper use:

```tsx
// this expects to be wrapped with AuthProvider to be able to auto infer current user
<UserScopeFromAuth>
  {/* everything scoped to user lifetime */}
</UserScopeFromAuth>
```

Manual use:

```tsx
// this is if you want to manually provide the user context
<UserScope userId={userId}>
  {/* everything scoped to user lifetime */}
</UserScope>
```

> [!NOTE]
> This implements fast last logged in user id retrieval from localStore to be ready asap.

> [!WARNING]
> This scope isn't some auth/security guards. This is just for a reset mechanism. And as the user id is optimistic here, you must manually useAuth() with proper non stale logged in user.

To manually add a new user scoped context provider modify `UserScopeExternalProviders`:

```tsx
function UserScopeExternalProviders({ children, UNVERIFIED_userId }) {
  return (
    <YourProviderA>
      {/* you have access to UNVERIFIED_userId if needed (not for sensitive things) */}
      <YourProviderB userId={UNVERIFIED_userId}>
        {/* ... more providers */}
        {children}
        {/* ... */}
      </YourProviderB>
    </YourProviderA>
  );
}
```

Then anything wrapped under `UserScope` (or indirectly via `UserScopeExternalProviders`) **including your custom external providers** have access to the user context with:

```tsx
const { UNVERIFIED_userId } = useUserScope();
```

> [!NOTE]
> All your external providers registered in UserScopeExternalProviders are keyed by UNVERIFIED_userId.
> Therefore they will be automatically remounted on UNVERIFIED_userId change.

## `2-chat-app-root-scope` lifetime

Initialize once at first chat route load, and provides all chat related global context (like chat navigation context)

Usage :

```tsx
<ChatAppRootScope>
  {/* everything scoped to chat app (never reset) */}
</ChatAppRootScope>
```

To manually add a new chat app root scoped context provider modify `ChatAppRootScopeExternalProviders`:

```tsx
function ChatAppRootScopeExternalProviders({ children }) {
  return (
    <YourProviderA>
      <YourProviderB>
        {/* ... more providers */}
        {children}
        {/* ... */}
      </YourProviderB>
    </YourProviderA>
  );
}
```

> [!NOTE]
> This is a stable scope. I will never trigger any rerender. And it doesn't hold any states. it will simply mount when under chat scope, and unmount otherwise.

## `3-chat-workspace-scope` lifetime

All the chat workspace scoped context. For now we don't have any context logic, but this already contains what should be resettable when changing context (like sidebar or something.)

Convenient context wrapper use:

```tsx
// this expects to be wrapped with proper context provider to infer workspace from.
<ChatWorkspaceScopeFromRouter>
  {/* everything scoped to workspace lifetime */}
</ChatWorkspaceScopeFromRouter>
```

> [!NOTE]
> You'll be able to implement custom workspace reactivity in ChatWorkspaceScopeFromRouter implementation when needed, then you will automatically have everything workspace related resetting as intended.

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

Then anything wrapped under `ChatWorkspaceScope` (or indirectly via `ChatWorkspaceScopeFromRouter`) **including your custom external providers** have access to the workspace context with:

```tsx
const { workspaceId } = useChatWorkspaceScope();
```

> [!NOTE]
> All your external providers registered in ChatWorkspaceScopeExternalProviders are keyed by workspaceId.
> Therefore they will be automatically remounted on workspaceId change.

## `4-chat-session-scope` lifetime

The contexts only bound to a specific `threadUuid`, will handle thread messages, streaming, draft, etc.

Usage :

```tsx
<ChatSessionScope isNew={isNew} sessionId={sessionId}>
  {/* everything scoped to chat session lifetime */}
</ChatSessionScope>
```

To manually add a new workspace scoped context provider modify `ChatSessionScopeExternalProviders`:

```tsx
function ChatSessionScopeExternalProviders({ children, isNew, sessionId }) {
  return (
    <YourProviderA>
      {/* you have access to sessionId and isNew if needed */}
      <YourProviderB sessionId={sessionId} isNew={isNew}>
        {/* ... more providers */}
        {children}
        {/* ... */}
      </YourProviderB>
    </YourProviderA>
  );
}
```

Then anything wrapped under `ChatSessionScope` **including your custom external providers** have access to the chat session context with:

```tsx
const { sessionId, isNew } = useChatSessionScope();
```

> [!NOTE]
> All your external providers registered in ChatSessionScopeExternalProviders are keyed by sessionId only.
> Therefore they will be automatically remounted on sessionId change (but not when isNew changes)
