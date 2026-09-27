# PRD — Streamdown Upgrade (Message UI Only, Standalone)

## Document Meta

- Status: ready-for-implementation
- Owner area: `apps/web`
- Goal: upgrade markdown renderer stack in chat message UI, no scope drift
- Constraint: this doc is the only required context for implementation

---

## 1) Why This Exists

Current chat message markdown stack is old and split across wrappers. We need latest Streamdown features/perf and a clean extension seam for link safety modal design ownership.

### 1.1 Current repo facts (verified)

- `streamdown` currently `^1.4.0` in `apps/web/package.json:87`.
- Tailwind source uses narrow path `@source "../node_modules/streamdown/dist/index.js"` in `apps/web/src/index.css:3`.
- Main markdown wrapper: `apps/web/src/components/ui-custom/markdown/smooth-markdown.tsx:5`.
- Active message markdown usage:
  - text parts: `apps/web/src/components/chat/message/_parts/text-part.tsx:19`
  - reasoning parts: `apps/web/src/components/chat/message/_parts/reasoning-part.tsx:38`
- Reasoning part already has explicit streaming signal: `part.state === "streaming"` at `apps/web/src/components/chat/message/_parts/reasoning-part.tsx:23`.
- Assistant message already computes message-level streaming status in `apps/web/src/components/chat/message/message-assistant.tsx:84`.

### 1.2 L2/L1 coupling facts (verified)

- L2 message wrapper imports only these from L1 `ai-elements/message`:
  - `Message`, `MessageContent`, `MessageResponse`, `Shimmer` (`apps/web/src/components/ui-custom/chat/message.tsx:4`).
- L2 reasoning does not use L1 `ai-elements/reasoning`; only uses `Shimmer` (`apps/web/src/components/ui-custom/chat/reasoning.tsx:13`).

Implication: full ai-elements registry upgrade is unnecessary for this PRD.

---

## 2) External Facts Used (verified)

From latest local references (`.llms/git-references/streamdown` and `.llms/git-references/ai-elements`):

- Streamdown latest architecture uses core `streamdown@2.x` + plugin packages `@streamdown/*`.
- Streamdown supports `mode="streaming" | "static"`; static mode removes streaming overhead.
- Streamdown supports link safety extension via `linkSafety` with:
  - `onLinkCheck` callback,
  - `renderModal` custom modal renderer.
- Streamdown includes lazy/deferred internals for heavy paths (code/mermaid components lazy loaded, mermaid deferred render).
- ai-elements upstream currently uses streamdown 2.x + streamdown plugins in message/reasoning components.

---

## 3) Problem Statement

Need to migrate message markdown rendering from legacy Streamdown setup to latest Streamdown plugin architecture, with strict scope:

1. no regressions in current chat message UI,
2. static mode for completed/history content,
3. streaming mode only for active content,
4. L2-owned link modal (shadcn-based) wired through Streamdown extension point,
5. no impact to prompt-input/model-selector or unrelated chat surfaces.

---

## 4) Scope

## 4.1 In scope

- Streamdown dependency upgrade in `apps/web/package.json`.
- Tailwind source update in `apps/web/src/index.css`.
- Message markdown wrapper refactor in `apps/web/src/components/ui-custom/markdown/smooth-markdown.tsx`.
- New L2 markdown utilities/components:
  - `apps/web/src/components/ui-custom/markdown/link-policy.ts`
  - `apps/web/src/components/ui-custom/markdown/link-safety-modal.tsx`
- Streaming signal propagation through message part pipeline:
  - `apps/web/src/components/chat/message/_parts/content.tsx`
  - `apps/web/src/components/chat/message/_parts/text-part.tsx`
  - `apps/web/src/components/chat/message/message-assistant.tsx`
  - `apps/web/src/components/chat/message/message-user.tsx`

## 4.2 Out of scope

- Full ai-elements registry reinstall/overwrite.
- Any change in:
  - `apps/web/src/components/ai-elements/prompt-input.tsx`
  - `apps/web/src/components/ai-elements/model-selector.tsx`
  - sidebar, input lifecycle, conversation scrolling, backend contract.
- Modal visual redesign beyond baseline parity.

---

## 5) Requirements

## 5.1 Functional

- FR1: Upgrade to `streamdown@^2.2.0` and install all required plugins:
  - `@streamdown/code`
  - `@streamdown/mermaid`
  - `@streamdown/math`
  - `@streamdown/cjk`
- FR2: For message markdown rendering:
  - use `mode="streaming"` only while message/part is streaming,
  - use `mode="static"` otherwise.
- FR3: Keep existing overflow guards unchanged in text/reasoning render paths.
- FR4: Link policy behavior:
  - same-origin links: open directly (no modal),
  - external links (trusted and untrusted): show modal.
- FR5: Modal implementation must be app-owned in L2 (`ui-custom/markdown`) and wired with Streamdown `linkSafety.renderModal`.
- FR6: Keep current L2 API stable for current callers unless explicitly noted in this doc.

## 5.2 Non-functional

- NFR1: No user-visible regressions in markdown features: text, tables, code highlight, mermaid, math, cjk.
- NFR2: No scope expansion into prompt input/model selector.
- NFR3: Keep implementation minimal and readable; single markdown config source.

---

## 6) Design Decisions

## D1 — Streamdown-first upgrade, no full ai-elements sync

Reason: L2 currently depends on tiny subset; full registry refresh is high blast radius with low value for this objective.

## D2 — Single markdown wrapper as source of truth

Reason: avoid config drift across text/reasoning paths.

## D3 — L2-owned link modal via Streamdown extension

Reason: Streamdown already exposes official seam (`linkSafety.renderModal`), no forking needed.

## D4 — Explicit streaming signal propagation for text parts

Reason: text part currently has no streaming prop; use message-level streaming boolean already computed in assistant message component.

---

## 7) Implementation Plan (Exact)

## Step 1 — Upgrade dependencies

Edit `apps/web/package.json`:

1. bump `streamdown` from `^1.4.0` to `^2.2.0`.
2. add deps:
   - `@streamdown/code`
   - `@streamdown/mermaid`
   - `@streamdown/math`
   - `@streamdown/cjk`

Also ensure CSS imports are wired in app entry used by web build:

- `katex/dist/katex.min.css` required (math plugin).
- `streamdown/styles.css` required only if using `animated` prop.

Note: in this PRD, `animated` prop is optional; default implementation can skip animated styling initially.

## Step 2 — Tailwind source path normalization

Edit `apps/web/src/index.css`:

- change line using `dist/index.js` to wildcard:
  - `@source "../node_modules/streamdown/dist/*.js";`

## Step 3 — Refactor `SmoothMarkdown` as canonical Streamdown adapter

Edit `apps/web/src/components/ui-custom/markdown/smooth-markdown.tsx`.

### 3.1 Target prop contract

Replace loose passthrough with explicit adapter props:

- `children: string`
- `isStreaming?: boolean`
- `startStreaming?: boolean` (existing smoothing behavior)
- `className?: string`
- optional `linkPolicy?: { trustedDomains?: string[] }` (optional; can default internally)

### 3.2 Internal behavior

1. keep `useSmoothText` smoothing.
2. define module-level `streamdownPlugins` object using all four plugins.
3. render `Streamdown` with:
   - `plugins={streamdownPlugins}`
   - `mode={isStreaming ? "streaming" : "static"}`
   - `isAnimating={Boolean(isStreaming)}`
   - existing className passthrough.
4. pass `linkSafety` object wired to policy + owned modal.

### 3.3 Example target shape

```tsx
const streamdownPlugins = { code, mermaid, math, cjk };

<Streamdown
  className={className}
  isAnimating={Boolean(isStreaming)}
  linkSafety={{
    enabled: true,
    onLinkCheck: (href) => resolveLinkKind(href, window.location.origin) === "in_app",
    renderModal: (props) => <LinkSafetyModal {...props} />,
  }}
  mode={isStreaming ? "streaming" : "static"}
  plugins={streamdownPlugins}
>
  {text}
</Streamdown>
```

## Step 4 — Add L2 link policy utility

Create `apps/web/src/components/ui-custom/markdown/link-policy.ts`.

Implement:

- type `LinkKind = "in_app" | "external_trusted" | "external_untrusted" | "invalid"`
- function `resolveLinkKind(href: string, origin: string, trustedDomains: string[]): LinkKind`

Rules:

1. parse with `new URL(href, origin)`.
2. if parse fails -> `invalid`.
3. if resolved URL origin === current origin -> `in_app`.
4. else if hostname exact-match or subdomain-match trusted list -> `external_trusted`.
5. else -> `external_untrusted`.

Include helper:

- `isTrustedHostname(hostname: string, trustedDomains: string[]): boolean`

Default trusted list constant in this file (can be empty initial list).

## Step 5 — Add L2 owned modal component

Create `apps/web/src/components/ui-custom/markdown/link-safety-modal.tsx`.

Implement with shadcn dialog primitives (`Dialog`, `DialogContent`, etc.).

Props must mirror Streamdown modal payload:

- `url: string`
- `isOpen: boolean`
- `onClose: () => void`
- `onConfirm: () => void`

Behavior:

- show URL and classification (`trusted` / `untrusted` optional label).
- cancel button -> `onClose`.
- continue button -> call `onConfirm`, then `onClose`.

## Step 6 — Thread streaming flag through message part pipeline

Current gap: `TextPart` has no streaming signal.

### 6.1 Update `MessageContentParts` contract

Edit `apps/web/src/components/chat/message/_parts/content.tsx`:

- add prop `isStreaming?: boolean`.
- when rendering `TextPart`, pass `isStreaming`.

### 6.2 Update `TextPart`

Edit `apps/web/src/components/chat/message/_parts/text-part.tsx`:

- add prop `isStreaming?: boolean`.
- pass `isStreaming` to `SmoothMarkdown`.

### 6.3 Update assistant/user callers

Edit `apps/web/src/components/chat/message/message-assistant.tsx`:

- already computes `isStreaming`; pass it into `MessageContentParts`.

Edit `apps/web/src/components/chat/message/message-user.tsx`:

- pass `isStreaming={false}` into `MessageContentParts`.

### 6.4 Update reasoning part

Edit `apps/web/src/components/chat/message/_parts/reasoning-part.tsx`:

- pass `isStreaming={isStreaming}` to `SmoothMarkdown`.

## Step 7 — Keep L1 ai-elements update optional and narrow

Do not run full registry update.

If compatibility issue appears, only inspect/handpick from:

- `apps/web/src/components/ai-elements/message.tsx`

No overwrite of other ai-elements files.

---

## 8) File Change Checklist

Mandatory:

1. `apps/web/package.json`
2. `apps/web/src/index.css`
3. `apps/web/src/components/ui-custom/markdown/smooth-markdown.tsx`
4. `apps/web/src/components/ui-custom/markdown/link-policy.ts` (new)
5. `apps/web/src/components/ui-custom/markdown/link-safety-modal.tsx` (new)
6. `apps/web/src/components/chat/message/_parts/content.tsx`
7. `apps/web/src/components/chat/message/_parts/text-part.tsx`
8. `apps/web/src/components/chat/message/_parts/reasoning-part.tsx`
9. `apps/web/src/components/chat/message/message-assistant.tsx`
10. `apps/web/src/components/chat/message/message-user.tsx`

Optional:

11. `apps/web/src/components/ai-elements/message.tsx` (only if required)

---

## 9) Acceptance Criteria

- AC1: Streamdown stack runs on v2 + plugins (all 4 plugins installed).
- AC2: Text markdown in user/assistant messages renders static when not streaming.
- AC3: Live assistant text/reasoning renders streaming mode while active.
- AC4: In-app links bypass modal.
- AC5: External links show L2-owned modal.
- AC6: No file changes in prompt-input/model-selector.
- AC7: No full ai-elements registry reinstall performed.

---

## 10) QA Plan

Run manual checks in chat UI:

1. plain text markdown + lists + tables in settled assistant message.
2. streaming assistant response updates smoothly.
3. reasoning block markdown renders while streaming and after settle.
4. code blocks highlight + controls.
5. mermaid blocks render (including off-screen then scroll-in).
6. math formula rendering (KaTeX styles loaded).
7. cjk punctuation/emphasis rendering sanity.
8. same-origin link click opens directly.
9. external link click opens L2 modal.

---

## 11) Risks + Mitigations

- Risk: missing CSS import for math or animation.
  - Mitigation: explicit checklist in Step 1.

- Risk: incorrect link classification for relative URLs.
  - Mitigation: normalize with `new URL(href, origin)` and unit-test helper.

- Risk: accidental scope creep.
  - Mitigation: strict file allowlist in Section 8.

---

## 12) Rollback

If regressions found:

1. revert markdown wrapper + part wiring files.
2. revert Streamdown/plugin deps.
3. keep link modal files isolated; no global dependency coupling.

---

## 13) Delivery Order

1. deps + css source update.
2. wrapper refactor.
3. link policy + modal.
4. part pipeline streaming prop wiring.
5. manual QA matrix.
6. optional selective L1 handpick only if needed.

---

## 14) Unresolved Questions

- none
