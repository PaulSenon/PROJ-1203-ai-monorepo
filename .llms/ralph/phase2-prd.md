# PRD - Phase 2: Chat Thread Session Architecture Refactor After Instant Navigation Feedback

## Problem Statement

Phase 1 solves the urgent user problem: navigation feedback becomes instant even when destination conversation rendering is expensive. However, the deeper architecture remains difficult to reason about.

Today, the chat input stays visually persistent while much of its actual state, actions, and reset behavior remain tightly bound to the current thread. Draft state, message actions, model state, and thread session behavior are mixed together across keyed resets and provider boundaries. This makes the app hard to evolve safely and creates fear around navigation and state refactors.

The problem is no longer only performance. It is ownership clarity.

The codebase needs a cleaner architecture where:

1. Persistent shell UI stays persistent for valid reasons.
2. Per-thread conversation session state resets for valid reasons.
3. Input behavior is easy to understand during thread switches.
4. Thread-scoped logic does not require broad remount patterns to stay correct.
5. Future performance work can happen without destabilizing correctness.

## Solution

Refactor chat architecture around an explicit split between:

1. **Stable shell state**
   - Visual chat shell.
   - Persistent input widget.
   - Focus handling.
   - Disabled/readiness chrome.
   - Navigation feedback state.

2. **Thread session state**
   - Draft for the active thread.
   - Send/regenerate behavior.
   - Message-session controls.
   - Thread-bound model and preferences that truly belong to a thread context.
   - Conversation-specific readiness and reset rules.

The stable input should remain mounted because it is a shell concern. However, it should no longer directly own or infer all thread-scoped behavior. Instead, it should bind to a per-thread controller/adapter that exposes the current thread session contract through a smaller and more explicit interface.

This phase removes architectural confusion by making thread resets explicit at the controller boundary rather than implicit through broad keyed remounting.

The refactor should preserve the phase-1 instant navigation model. Phase 2 is not allowed to regress the urgent/deferred separation already established.

## User Stories

1. As a chat user, I want the input to remain visually stable during thread navigation, so that the app feels coherent.
2. As a chat user, I want the input state to correctly reflect the active thread after switching, so that I never type into stale context.
3. As a chat user, I want each thread to restore or reset its draft according to explicit rules, so that draft behavior feels consistent.
4. As a chat user, I want send, regenerate, and related actions to always target the correct thread, so that navigation does not produce cross-thread mistakes.
5. As a chat user, I want model or thread-specific composer settings to follow clear thread rules, so that behavior is predictable.
6. As a chat user, I want disabled input states during navigation or loading to feel intentional, so that I understand when the app is ready.
7. As a chat user, I want new chat to feel lightweight and immediately usable, so that starting fresh is frictionless.
8. As a chat user, I want thread switching not to lose valid draft state accidentally, so that my work is preserved correctly.
9. As a chat user, I want thread switching not to restore invalid stale state into the wrong thread, so that correctness wins over convenience.
10. As a developer, I want stable shell concerns separated from thread session concerns, so that ownership is obvious.
11. As a developer, I want provider remounts used only where semantically necessary, so that architecture stays understandable.
12. As a developer, I want to remove “key by current thread id” as a general reset mechanism where a smaller state boundary would be clearer.
13. As a developer, I want the input widget to bind to a thread controller interface, so that thread semantics can evolve without remounting the shell.
14. As a developer, I want thread session reset rules written down explicitly, so that future changes do not reintroduce hidden coupling.
15. As a maintainer, I want a deep module around thread composer/session behavior, so that most chat complexity is encapsulated behind a stable interface.
16. As a maintainer, I want phase 2 to preserve phase-1 instant nav feedback, so that cleanup does not regress UX.
17. As a maintainer, I want tests to target thread behavior contracts instead of provider internals, so that refactors remain safe.
18. As a maintainer, I want thread-scoped and app-scoped preferences to be distinguished clearly, so that resets become principled.
19. As a maintainer, I want future performance work to have clear seams, so that improvements stop fighting hidden state ownership.
20. As a maintainer, I want the codebase to be less scary to change, so that long-term velocity improves.

## 'Polishing' Requirements

1. Persistent shell behavior must feel smoother after refactor, not merely equivalent.
2. Input focus behavior must remain deliberate and stable across thread switches.
3. Draft restoration and clearing must feel consistent and non-surprising.
4. New-chat behavior must remain especially lightweight.
5. No user-visible regression in send/regenerate/model actions.
6. No accidental flashing, remount-feel, or stale-value pop-in during thread switches.
7. Temporary migration adapters and debug logs must be removed before merge.
8. Naming of new modules and contracts must be simple and self-explanatory.

## Implementation Decisions

1. **Architectural split**
   - Separate stable shell modules from thread session modules.
   - Stable shell owns persistent UI and transient nav feedback.
   - Thread session owns thread-specific draft/message/composer semantics.

2. **Controller pattern**
   - Introduce a thread composer/session controller as the deep module for thread-bound input behavior.
   - The controller should expose a narrow interface that the stable input shell can consume.
   - The shell should not need to know about provider reset mechanics or thread remount strategy.

3. **Reset policy**
   - Replace broad keyed reset behavior with explicit reset decisions at thread session boundaries.
   - Keep keyed remounting only where the state is truly identity-bound and an explicit reset API would be less correct or less clear.

4. **Draft ownership policy**
   - Define draft semantics explicitly:
     - when draft is restored,
     - when draft is ignored,
     - when draft is cleared,
     - when new chat differs from existing thread behavior.
   - Do not leave draft behavior to accidental mount timing.

5. **Action binding policy**
   - Sending, regenerating, tool actions, and related composer actions must bind through the current thread session controller, not through implicit ambient current-thread assumptions in the shell.

6. **Preference ownership policy**
   - Distinguish thread-specific preferences from app-level preferences.
   - Only thread-owned preferences should reset on thread change.
   - App-level preferences should remain stable unless explicitly changed by the user.

7. **Provider simplification**
   - Reduce provider remount churn where ownership can be expressed with clearer state transitions.
   - Preserve provider boundaries that still represent meaningful domains.

8. **Navigation compatibility**
   - Phase 2 must preserve the urgent/deferred navigation seam introduced in phase 1.
   - No phase-2 decision may re-couple shell feedback to heavy conversation rendering.

9. **New chat policy**
   - New chat should remain the lightest path.
   - The architecture should treat new chat as a first-class thread session mode rather than as an awkward exception bolted onto existing-thread behavior.

10. **Migration strategy**
    - Execute with an adapter-compatible migration path where possible.
    - Prefer incremental replacement of hidden coupling over a single all-at-once rewrite.

11. **Scope discipline**
    - This phase is about ownership clarity and reset architecture.
    - It is not a general redesign of all chat UX or all chat data flow.

## Testing Decisions

1. **Test quality bar**
   - Test behavior contracts visible from the shell and thread session boundaries.
   - Do not lock tests to provider topology or incidental implementation details.
   - Good tests prove that thread switching, draft rules, and action targeting behave correctly.

2. **Primary modules to test**
   - Thread composer/session controller.
   - Stable input shell binding behavior.
   - Draft restoration/reset rules.
   - Thread-switch action targeting.
   - Preference reset/persistence rules where they affect thread switching.

3. **Behavioral scenarios to validate**
   - Switch between two existing threads with different drafts; confirm correct draft ownership.
   - Switch from an existing thread to new chat; confirm new-chat input readiness and correct reset behavior.
   - Return from new chat to an existing thread; confirm expected draft restoration policy.
   - Send from the active thread immediately after a switch; confirm the action targets the correct thread.
   - Confirm regenerate and similar actions stay scoped to the correct thread after switching.
   - Confirm stable shell remains mounted while thread session semantics still reset correctly.
   - Confirm phase-1 instant nav behavior remains intact through the refactor.

4. **Automated checks**
   - Run `pnpm run check-types`.

5. **Manual QA emphasis**
   - Manual QA should focus on correctness under switching, not only visual feel.
   - Include fast switching, partially typed drafts, new-chat transitions, and action targeting.

6. **Prior art**
   - Reuse existing chat behavioral test style where available.
   - Prefer contract-level tests around session/controller interfaces over tests that mirror internal provider wiring.

## Out of Scope

1. Rewriting the entire routing system.
2. Rewriting all chat data fetching or transport layers.
3. Large visual redesign of composer or conversation UI.
4. New chat product features unrelated to architecture cleanup.
5. General performance initiatives outside the boundaries of session ownership and reset clarity.
6. Replacing every existing provider purely for stylistic consistency.
7. Introducing speculative abstractions not needed by concrete thread/session behavior.

## Further Notes

1. Phase 2 should begin only after phase 1 is validated in real interaction testing.
2. The main purpose of phase 2 is to make the chat architecture make sense, not merely to “clean up” code stylistically.
3. The best outcome is a deep thread-session module with a small shell-facing interface and explicit reset semantics.
4. If any proposed refactor step weakens phase-1 navigation responsiveness, that step must be redesigned before implementation continues.
5. This phase should make future chat work easier, safer, and less dependent on keyed remount habits.
