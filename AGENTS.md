# Important rules

In all interactions, be extremely concise and sacrifice grammar for the sake of concision.
At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.
When planning tasks, you must give explicitly give implementation details. The plan should be a document ready to be forwarded to a junior developer with minimum ambiguity and room for error in implementation. Most of the time you won't be the one implementing the task, so you must be precise and detailed (without being too verbose).
You can spawn sub-agents with specific skills at any time to run offload deeper side-researches, answer complex question, give you external feedback from a skill perspective (e.g. react performance audit) while keeping your current focus on the conversation and avoid drifting too far off the main topic. The goal is also to not pollute conversation context that is limited in size.
When assuming something not based on online verified proof, rate confidence score in % first, and if bellow 95%, you must verify using doc, web, anything external, and trust only good sources.
Use context7 to fetch doc before using any library or doing important refactoring.
We are using react19+ so forwardRef is not needed. Use ref as prop instead.
We are using shadcn and tailwind
Always start answer giving your name and version (e.g. "Claude Sonnet 4.5").
Never run any dev commands apart from `pnpm run check-types` of `pnpm run test` (with -F for single target if needed like `pnpm -F web run test`). User will always run the dev server before asking you anything. If something isn't working as intended, ask the user to perform the action and stop answering. Only command allowed are non-destructive / readonly commands for searching content etc.
Raise warning if you think user is asking something that is going to be a bad idea.
When user ask technical question, do not implement anything and instead, gather all official documentation and resources to answer the question in educative way. (like a dev blog article with code examples and explanations)
Never guess product/spec details. If ambiguity, ask and wait; update PRD/AGENTS before implementation.

## Code principles

- Simplicity over complexity: always prefer the simplest elegant solution instead of over-engineering. (You might even raise warning if something will lead to over-engineering because taking the wrong path)
  - If choosing complex path, present simple alternative + tradeoff and wait for explicit approval.
- Typesafety like you were Matt Pocock or Tanner Linsley. When needed, build strong type system isolated from runtime usage, allowing DX with almost no TS syntax outside of type core, but with best in class typesafety (inspiration: tanstack, oRPC/tRPC)
- When designing React component, always keep in mind:
  - Accessibility and SEO (html and semantic structure, but also design and navigation)
  - Performance (React and Web)
  - Browser compatibility (all recent browsers, with progressive enhancement allowed if nice to have)
  - component reusability and composability (inspiration: shadcn, you must design everything in a shadcn-like way, composing from shadcn/ui primitives and other shadcn registries when needed) (also when needed to change a component from an external registry, please refrain to modify the component directly as it will complicate future upgrade. I needed try to compose a custom component set that use external component and still compose with them (interop))
- for styling always use tailwind respecting the rules and themes.
- Never barrel export anything (not allowed by linter rules) nor reexport anything from external libraries (not allowed by linter rules). So unless necessary we should have index.ts like files in folders

## Component architecture layers

> Full guide with decision trees and examples: `apps/web/src/components/README.md`

**3-Layer Model** (dependency direction):

- **L1 External** (`ui/`, `ai-elements/`): Immutable registries. Never edit, only compose/wrap.
- **L2 Design System** (`ui-custom/[domain]/`): App-agnostic compound components. No app hooks/types (L1 types OK). Exports namespace objects (`Message.*`, `Sidebar.*`). internal manageable states belongs to L2 (e.g. if a toggle has impact only on component state, it should not be exposed as props)
- **L3 App Layer** (`[feature]/`, `shared/`): Feature-specific components. Uses hooks, knows app types, composes L2.

**Quick placement rule**: If it imports app hooks or app types → L3. Otherwise → L2.

**L3 sub-organization**:

- Simple Feature Root: `[feature].tsx` — main export, hooks + composition
- Complex Feature Entry: `[feature]/[feature].tsx` — entry file = folder name
- Variant: `[feature]/[feature]-[variant].tsx`
- Feature Layout: `[feature]/[feature]-layout.tsx` — pure composition (optional)
- Feature Part: `[feature]/_parts/[part].tsx`
- Feature Hook: `[feature]/_hooks/use-[purpose].ts` — feature-specific hooks
- Shared: `shared/[name].tsx` — L3 components used by 2+ features

## UI/UX Design guidelines

- Minimalism:
  - minimal content: only show the necessary content, opting for revealing additional features contextually when needed (on hover, click, context menu, etc.)
  - minimal visual hierarchy: by default, avoid any visual heavy UI like borders, backgrounds, etc. Keep those only for when needed to highlight or contrast something contextually.
- Subtle Complexity:
  - While sticking to minimalism principle, I like to add small little details like masks, blur, shadows, and more advanced composition that add visually invisible complexity, but increase the perceived quality of the UI. I wan't to be minimalistic but high end quality. (Inpiring people on that: Josh Comeau, Shadcn, Hayden Bleasel, Louis Jordan, Jh3yy, Austin Malerba)
- Seamless interactions:
  - Every interaction must be buttery smooth and feel natural. This might add a little bit of complexity to the code, but it's worth it. No jumps, no delays, no unintended behavior, great touch support, great keyboard support.

## Additional notes

This codebase will outlive you. Every shortcut you take becomes
someone else's burden. Every hack compounds into technical debt
that slows the whole team down.

You are not just writing code. You are shaping the future of this
project. The patterns you establish will be copied. The corners
you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

## Memory

You have no memory of previous conversations and previous work done.
Do help with that, you will be able to manage yourself the memory via dedicated txt files.
You're in charge of reading and updating them.

- .llms/memory/core_facts.txt => durable project-level truths only. Examples: long-term architecture invariants, repo-wide conventions, permanent contracts. Never write task logs, temporary TODOs, or "implemented X today". If unsure, do not write here.
- .llms/memory/short_term.txt => working log for recent tasks/decisions that may help next sessions. Can contain implementation notes, follow-ups, and temporary context. This file is expected to decay and be pruned.
- .llms/memory/mental_board.txt => tiny active whiteboard (max 2Ko): current goal, in-progress tracks, blockers, immediate next steps. No historical logs.
- .llms/memory/backlog.txt => deferred/off-scope work parking lot. Use this when a task is valuable but not on current goal path, or would create scope drift now. This is not for immediate follow-up items.

Memory quality rules:

- `core_facts` must stay useful for any dev months later.
- `short_term` is where session/task details belong.
- `mental_board` must reflect present strategy, not chronology.
- `backlog` is for postponed ideas with enough context to resume later without re-discovery.
- when a `short_term` item becomes a durable truth, promote it to `core_facts`.
- when a `core_facts` line is no longer true, edit or remove it immediately.
- when a task is explicitly postponed/off-scope, add/update a `backlog` entry.
- at session start: read `mental_board` first, then scan `backlog` only if relevant to current scope.

Backlog entry format (llm-friendly):

- `id`: stable slug
- `status`: `pending | parked | dropped | done`
- `captured_at`: date
- `context`: what we were doing when this appeared
- `why_deferred`: why not now
- `rough_spec`: rough target design/spec
- `decisions`: already decided points
- `open_questions`: unresolved points
- `next_trigger`: when to pick this up

NB: if you want to manage your memory another way, fill free to do it but remember to write this done here otherwise you will forget...

In all interactions, be extremely concise and sacrifice grammar for the sake of concision.
When you need to research, implement, side-track anything where only the end result could benefit to the current conversation, you must use sub-agents wisely to avoid filling current context with side-track reasoning.
User loves minimal code example over long technical explanation when this makes sense. So feel free to use this toward your goal of sacrificing grammar for the sake of concision.
