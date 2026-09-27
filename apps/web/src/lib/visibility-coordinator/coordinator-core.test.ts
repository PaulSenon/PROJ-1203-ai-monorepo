import { afterEach, describe, expect, it, vi } from "vitest";

import { createCoordinatorSpecs } from "./coordinator-config";
import {
  createVisibilityCoordinator,
  type RunCompletionEvent,
} from "./coordinator-core";

// mo
function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
  // biome-ignore lint/suspicious/noMisplacedAssertion: <explanation>
  expect(value).not.toBeNull();
}

afterEach(() => {
  vi.restoreAllMocks();
});

// Shared spec mirrors the intended core MVP scenarios.

// this coordinator cover all non empty use-cases
function createExhaustiveCoordinator() {
  const specs = createCoordinatorSpecs({
    surfaces: {
      "surface-mono-checkpoint-A-keyed": {
        initialHidden: true,
        checkpoints: ["checkpoint-A-keyed"],
        keyed: true,
      },
      "surface-mono-checkpoint-B": {
        checkpoints: ["checkpoint-B"],
      },
      "surface-multi-checkpoint-C-D-keyed": {
        checkpoints: ["checkpoint-C-keyed", "checkpoint-D-keyed"],
        keyed: true,
      },
      "surface-multi-checkpoint-E-F": {
        initialHidden: true,
        checkpoints: ["checkpoint-E", "checkpoint-F"],
      },
    },
    scenarios: {
      "scenario-mono-surface-mono-checkpoint-A-keyed": {
        surfaces: ["surface-mono-checkpoint-A-keyed"],
      },
      "scenario-mono-surface-mono-checkpoint-B": {
        surfaces: ["surface-mono-checkpoint-B"],
      },
      "scenario-multi-surface-mono-checkpoint-A-B-keyed": {
        surfaces: [
          "surface-mono-checkpoint-A-keyed",
          "surface-mono-checkpoint-B",
        ],
      },
      "scenario-mono-surface-multi-checkpoint-C-D-keyed": {
        surfaces: ["surface-multi-checkpoint-C-D-keyed"],
      },
      "scenario-mono-surface-multi-checkpoint-E-F": {
        surfaces: ["surface-multi-checkpoint-E-F"],
      },
      "scenario-all": {
        surfaces: [
          "surface-mono-checkpoint-A-keyed",
          "surface-mono-checkpoint-B",
          "surface-multi-checkpoint-C-D-keyed",
          "surface-multi-checkpoint-E-F",
        ],
      },
    },
  });
  return createVisibilityCoordinator(specs);
}

function createRealisticCoordinator() {
  const spec = createCoordinatorSpecs({
    surfaces: {
      sidebar: {
        checkpoints: ["sidebar-ready"],
        initialHidden: true,
      },
      conversation: {
        checkpoints: ["conversation-ready", "prompt-ready"],
        keyed: true,
      },
      "demo-surface-keyed": {
        checkpoints: ["demo-checkpoint-with-key"],
        keyed: true,
      },
      "demo-surface-not-keyed": {
        checkpoints: ["demo-checkpoint-without-key"],
      },
    },
    scenarios: {
      "initial-load": {
        surfaces: ["sidebar", "conversation"],
      },
      "nav-to-session": {
        surfaces: ["conversation"],
      },
      "demo-sidebar-only": {
        surfaces: ["sidebar"],
      },
      "demo-keyless-scenario": {
        surfaces: ["demo-surface-not-keyed"],
      },
      "demo-keyed-scenario": {
        surfaces: ["demo-surface-keyed"],
      },
    },
  });
  return createVisibilityCoordinator(spec);
}

type RealisticCoordinator = ReturnType<typeof createRealisticCoordinator>;
type RealisticSurfaceId = Parameters<
  RealisticCoordinator["subscribeSurfaceState"]
>[0];
type RealisticReadyInput = Parameters<
  RealisticCoordinator["subscribeReadyHandle"]
>[0];

function observeRealisticSurfaceState(
  coordinator: RealisticCoordinator,
  surface: RealisticSurfaceId
) {
  const events: ReturnType<RealisticCoordinator["getSurfaceState"]>[] = [];

  const unsubscribe = coordinator.subscribeSurfaceState(surface, () => {
    events.push({ ...coordinator.getSurfaceState(surface) });
  });

  return { events, unsubscribe };
}

function observeRealisticReadyHandle(
  coordinator: RealisticCoordinator,
  input: RealisticReadyInput
) {
  const events: ReturnType<RealisticCoordinator["getCurrentReadyHandle"]>[] =
    [];

  const unsubscribe = coordinator.subscribeReadyHandle(input, () => {
    events.push(coordinator.getCurrentReadyHandle(input));
  });

  return { events, unsubscribe };
}

function observeRealisticRunCompletion(coordinator: RealisticCoordinator) {
  const events: Array<
    RunCompletionEvent<RealisticSurfaceId, string> & {
      targetedSurfaces: string[];
    }
  > = [];

  const unsubscribe = coordinator.subscribeRunCompletion((event) => {
    events.push({
      scenario: event.scenario,
      runKey: event.runKey,
      elapsedMs: event.elapsedMs,
      targetedSurfaces: [...event.targetedSurfaces],
    });
  });

  return { events, unsubscribe };
}

describe("initial state case", () => {
  it("respect initialHidden config", () => {
    const coordinator = createRealisticCoordinator();

    expect(coordinator.getSurfaceState("sidebar").hidden).toBe(true);
    expect(coordinator.getSurfaceState("conversation").hidden).toBe(false);
  });

  it('should be hard-codded "initial" scenario', () => {
    const coordinator = createRealisticCoordinator();

    expect(coordinator.getSurfaceState("sidebar").scenario).toBe("initial");
    expect(coordinator.getSurfaceState("conversation").scenario).toBe(
      "initial"
    );
  });

  it('should expose "initial" kind', () => {
    const coordinator = createRealisticCoordinator();

    expect(coordinator.getSurfaceState("sidebar").kind).toBe("initial");
    expect(coordinator.getSurfaceState("conversation").kind).toBe("initial");
  });

  it("should not have settled fields yet", () => {
    const coordinator = createRealisticCoordinator();

    expect(coordinator.getSurfaceState("sidebar")).not.toHaveProperty(
      "elapsedMs"
    );
    expect(coordinator.getSurfaceState("sidebar")).not.toHaveProperty(
      "interrupted"
    );
    expect(coordinator.getSurfaceState("conversation")).not.toHaveProperty(
      "elapsedMs"
    );
    expect(coordinator.getSurfaceState("conversation")).not.toHaveProperty(
      "interrupted"
    );
  });

  it("should have not ready handles", () => {
    const coordinator = createRealisticCoordinator();

    expect(
      coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-a",
      })
    ).toBe(null);
    expect(
      coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-a",
      })
    ).toBe(null);
    expect(
      coordinator.getCurrentReadyHandle({
        checkpoint: "sidebar-ready",
      })
    ).toBe(null);
  });

  it("should not trigger any state listener trigger", () => {
    const coordinator = createRealisticCoordinator();
    const sidebarListener = vi.fn();
    const conversationListener = vi.fn();

    coordinator.subscribeSurfaceState("sidebar", sidebarListener);
    coordinator.subscribeSurfaceState("conversation", conversationListener);

    expect(sidebarListener).not.toHaveBeenCalled();
    expect(conversationListener).not.toHaveBeenCalled();
  });

  it("should not trigger any ready-handle listener trigger", () => {
    const coordinator = createRealisticCoordinator();
    const sidebarListener = vi.fn();
    const conversationListener = vi.fn();

    coordinator.subscribeReadyHandle(
      { checkpoint: "sidebar-ready" },
      sidebarListener
    );
    coordinator.subscribeReadyHandle(
      { checkpoint: "conversation-ready", runKey: "thread-a" },
      conversationListener
    );

    expect(sidebarListener).not.toHaveBeenCalled();
    expect(conversationListener).not.toHaveBeenCalled();
  });
});

describe("interrupted cases", () => {
  it("should stay pending on first run start", () => {
    const coordinator = createRealisticCoordinator();

    coordinator.startRun("initial-load", { runKey: "thread-a" });

    expect(coordinator.getSurfaceState("sidebar")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "initial-load",
    });
    expect(coordinator.getSurfaceState("conversation")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "initial-load",
    });
  });

  it("should keep pending shape on same scenario restart (only reset with new cycleId)", () => {
    const coordinator = createRealisticCoordinator();

    coordinator.startRun("initial-load", { runKey: "thread-a" });
    coordinator.startRun("initial-load", { runKey: "thread-b" });

    expect(coordinator.getSurfaceState("sidebar")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "initial-load",
    });
    expect(coordinator.getSurfaceState("conversation")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "initial-load",
    });
  });

  it("should keep pending shape when current run covers less surfaces than next run", () => {
    const coordinator = createRealisticCoordinator();

    coordinator.startRun("nav-to-session", { runKey: "thread-a" });
    coordinator.startRun("initial-load", { runKey: "thread-b" });

    expect(coordinator.getSurfaceState("sidebar")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "initial-load",
    });
    expect(coordinator.getSurfaceState("conversation")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "initial-load",
    });
  });

  describe("should be interrupted when current run covers more surfaces than next run", () => {
    it("[default]", () => {
      const coordinator = createRealisticCoordinator();

      coordinator.startRun("initial-load", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      expect(coordinator.getSurfaceState("sidebar")).toEqual({
        kind: "settled",
        hidden: false,
        scenario: "nav-to-session",
        interrupted: true,
        elapsedMs: 0,
      });
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "nav-to-session",
      });
    });

    it("[variant with same runKey]", () => {
      const coordinator = createRealisticCoordinator();

      const sameRunKey = "thread-a";
      coordinator.startRun("initial-load", { runKey: sameRunKey });
      coordinator.startRun("nav-to-session", { runKey: sameRunKey });

      expect(coordinator.getSurfaceState("sidebar")).toEqual({
        kind: "settled",
        hidden: false,
        scenario: "nav-to-session",
        interrupted: true,
        elapsedMs: 0,
      });
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "nav-to-session",
      });
    });
  });
});

describe("same scenario rerun cases", () => {
  it("should skip regenerating a new cycle when same scenario starts again with same runKey", () => {
    // SETUP
    const coordinator = createRealisticCoordinator();
    const listener = vi.fn();

    // TARGET
    coordinator.subscribeReadyHandle(
      { checkpoint: "conversation-ready", runKey: "thread-a" },
      listener
    );

    // CASE
    coordinator.startRun("nav-to-session", { runKey: "thread-a" });
    const firstHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-a",
    });
    assertNonNull(firstHandle);
    listener.mockClear();

    coordinator.startRun("nav-to-session", { runKey: "thread-a" });
    const secondHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-a",
    });
    assertNonNull(secondHandle);

    // ASSERT
    expect(secondHandle).toBe(firstHandle);
    expect(listener).not.toHaveBeenCalled();
  });

  it("should start a new cycle when same scenario starts again with a different runKey", () => {
    // SETUP
    const coordinator = createRealisticCoordinator();
    const nextRunKeyListener = vi.fn();

    // TARGET
    coordinator.subscribeReadyHandle(
      { checkpoint: "conversation-ready", runKey: "thread-b" },
      nextRunKeyListener
    );

    // CASE
    coordinator.startRun("nav-to-session", { runKey: "thread-a" });
    const firstHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-a",
    });
    assertNonNull(firstHandle);

    coordinator.startRun("nav-to-session", { runKey: "thread-b" });
    const secondHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-b",
    });
    assertNonNull(secondHandle);

    // ASSERT
    expect(secondHandle).not.toBe(firstHandle);
    expect(nextRunKeyListener).toHaveBeenCalledTimes(1);
  });
});

describe("ready-handle listeners", () => {
  describe("case new run", () => {
    describe("[with runKey]", () => {
      it("[runKey] should react on new run targeting same checkpoint and runKey", () => {
        // SETUP
        const sameRunKey = "key-a";
        const coordinator = createExhaustiveCoordinator();
        const listener = vi.fn();

        // TARGET
        coordinator.subscribeReadyHandle(
          { checkpoint: "checkpoint-A-keyed", runKey: sameRunKey },
          listener
        );

        // CASE 1
        coordinator.startRun(
          "scenario-mono-surface-mono-checkpoint-A-keyed",
          { runKey: sameRunKey } //! SAME KEY
        );
        // checkpoint and runKey both matches, so should trigger
        expect(listener).toHaveBeenCalledTimes(1);
        listener.mockClear();

        // CASE 2
        coordinator.startRun(
          "scenario-multi-surface-mono-checkpoint-A-B-keyed",
          { runKey: sameRunKey } //! SAME KEY
        );
        // checkpoint and runKey both matches, so should trigger
        expect(listener).toHaveBeenCalledTimes(1);
        listener.mockClear();

        // CASE 3
        coordinator.startRun(
          "scenario-all",
          { runKey: sameRunKey } //! SAME KEY
        );
        // checkpoint and runKey both matches, so should trigger
        expect(listener).toHaveBeenCalledTimes(1);
        listener.mockClear();
      });

      it("[runKey] should not react on new run targeting same checkpoint but different runKey", () => {
        // SETUP
        const [runKeyA, runKeyB] = ["key-a", "key-b"];
        const coordinator = createExhaustiveCoordinator();
        const listener = vi.fn();

        // TARGET
        coordinator.subscribeReadyHandle(
          { checkpoint: "checkpoint-A-keyed", runKey: runKeyA },
          listener
        );

        // CASE 1
        coordinator.startRun(
          "scenario-mono-surface-mono-checkpoint-A-keyed",
          { runKey: runKeyB } //! DIFFERENT KEY
        );
        // checkpoint matches, but not runKey, so should not trigger
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();

        // CASE 2
        coordinator.startRun(
          "scenario-multi-surface-mono-checkpoint-A-B-keyed",
          { runKey: runKeyB } //! DIFFERENT KEY
        );
        // checkpoint matches, but not runKey, so should not trigger
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();

        // CASE 3
        coordinator.startRun(
          "scenario-all",
          { runKey: runKeyB } //! DIFFERENT KEY
        );
        // checkpoint matches, but not runKey, so should not trigger
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();
      });

      it("[runKey] should not react on new run targeting different checkpoint but same runKey", () => {
        // SETUP
        const sameRunKey = "key-a";
        const coordinator = createExhaustiveCoordinator();
        const listener = vi.fn();

        // TARGET
        coordinator.subscribeReadyHandle(
          { checkpoint: "checkpoint-A-keyed", runKey: sameRunKey },
          listener
        );

        // CASE 1
        coordinator.startRun(
          "scenario-mono-surface-multi-checkpoint-C-D-keyed",
          {
            runKey: sameRunKey, //! SAME KEY
          }
        );
        // no checkpoint overlap, so even if runKey is same, it shouldn't trigger.
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();

        // CASE 2
        coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
        // no checkpoint overlap, so even if runKey is same, it shouldn't trigger.
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();

        // CASE 3
        coordinator.startRun("scenario-mono-surface-multi-checkpoint-E-F");
        // no checkpoint overlap, so even if runKey is same, it shouldn't trigger.
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();
      });
    });

    describe("[without runKey]", () => {
      it("[no runKey] should react on new run targeting same checkpoint", () => {
        // SETUP
        const coordinator = createExhaustiveCoordinator();
        const listener = vi.fn();

        // TARGET
        coordinator.subscribeReadyHandle(
          { checkpoint: "checkpoint-B" },
          listener
        );

        // CASE 1: multi surface
        coordinator.startRun(
          "scenario-multi-surface-mono-checkpoint-A-B-keyed",
          { runKey: "key-a" }
        );
        // keyless checkpoint matches, so should trigger
        expect(listener).toHaveBeenCalledTimes(1);
        listener.mockClear();

        // CASE 2: mono surface
        coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
        // keyless checkpoint matches, so should trigger
        expect(listener).toHaveBeenCalledTimes(1);
        listener.mockClear();

        // CASE 3: all
        coordinator.startRun("scenario-all", { runKey: "key-a" });
        // keyless checkpoint matches, so should trigger
        expect(listener).toHaveBeenCalledTimes(1);
        listener.mockClear();
      });

      it("[no runKey] should not react on new run targeting different checkpoint", () => {
        // SETUP
        const coordinator = createExhaustiveCoordinator();
        const listener = vi.fn();

        // TARGET
        coordinator.subscribeReadyHandle(
          { checkpoint: "checkpoint-B" },
          listener
        );

        // CASE 1: mono surface
        coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
          runKey: "key-a",
        });
        // no overlap on checkpoint, so should not trigger
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();

        // CASE 2: multi surface
        coordinator.startRun("scenario-mono-surface-multi-checkpoint-E-F");
        // no overlap on checkpoint, so should not trigger
        expect(listener).not.toHaveBeenCalled();
        listener.mockClear();
      });
    });
  });

  describe("case end of run", () => {
    it("[runKey] should react on run end targeting same checkpoint and runKey", () => {
      // SETUP 1
      const sameRunKey = "key-a";
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeReadyHandle(
        { checkpoint: "checkpoint-A-keyed", runKey: sameRunKey },
        listener
      );

      // CASE 1: mono-surface
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
        runKey: sameRunKey,
      });
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle1 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-A-keyed",
        runKey: sameRunKey,
      });
      assertNonNull(readyHandle1);
      coordinator.signalReady(readyHandle1);
      // handle changes from current handle -> null on completion
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // CASE 2: multi surface
      coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
        runKey: sameRunKey,
      });
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle2 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-A-keyed",
        runKey: sameRunKey,
      });
      assertNonNull(readyHandle2);
      coordinator.signalReady(readyHandle2);
      const readyHandle3 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-B",
      });
      assertNonNull(readyHandle3);
      coordinator.signalReady(readyHandle3);
      // handle changes from current handle -> null on completion
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("[no runKey] should react on run end targeting same checkpoint", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeReadyHandle(
        { checkpoint: "checkpoint-B" },
        listener
      );

      // CASE 1: mono surface
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle1 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-B",
      });
      assertNonNull(readyHandle1);
      coordinator.signalReady(readyHandle1);
      // handle changes from current handle -> null on completion
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // CASE 2: multi surface
      coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
        runKey: "key-a",
      });
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle2 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-B",
      });
      assertNonNull(readyHandle2);
      coordinator.signalReady(readyHandle2);
      const readyHandle3 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-A-keyed",
        runKey: "key-a",
      });
      assertNonNull(readyHandle3);
      coordinator.signalReady(readyHandle3);
      // handle changes from current handle -> null on completion
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();
    });
  });
  describe("case interrupted", () => {
    it("[runKey] should react on run interrupted targeting same checkpoint and runKey", () => {
      // SETUP
      const sameRunKey = "key-a";
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeReadyHandle(
        { checkpoint: "checkpoint-A-keyed", runKey: sameRunKey },
        listener
      );

      // CASE 1:
      coordinator.startRun("scenario-all", { runKey: sameRunKey });
      listener.mockClear();
      coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
        runKey: sameRunKey,
      });
      expect(
        coordinator.getSurfaceState("surface-mono-checkpoint-A-keyed")
      ).toEqual({
        kind: "settled",
        hidden: false,
        scenario: "scenario-mono-surface-multi-checkpoint-C-D-keyed",
        interrupted: true,
        elapsedMs: 0,
      });
      // interruption clears the current handle for this selector
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("[no runKey] should react on run interrupted targeting same checkpoint", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeReadyHandle(
        { checkpoint: "checkpoint-B" },
        listener
      );

      // CASE 1:
      coordinator.startRun("scenario-all", { runKey: "key-a" });
      listener.mockClear();
      coordinator.startRun("scenario-mono-surface-multi-checkpoint-E-F");
      expect(coordinator.getSurfaceState("surface-mono-checkpoint-B")).toEqual({
        kind: "settled",
        hidden: false,
        scenario: "scenario-mono-surface-multi-checkpoint-E-F",
        interrupted: true,
        elapsedMs: 0,
      });
      // interruption clears the current handle for this selector
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
  it("should unsubscribe when explicitly called", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    const listener = vi.fn();
    const unsubscribe = coordinator.subscribeReadyHandle(
      { checkpoint: "checkpoint-B" },
      listener
    );

    // INITIALIZE
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
    expect(listener).toHaveBeenCalledTimes(1);
    coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
      runKey: "key-a",
    });
    expect(listener).toHaveBeenCalledTimes(2);

    // TRIGGER
    unsubscribe(); //! unsubscribe
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");

    // ASSERT
    expect(listener).toHaveBeenCalledTimes(2); //! stop increasing
  });
});

describe("surface state listeners", () => {
  describe("case new run", () => {
    it("should react on new run targeting same surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState(
        "surface-mono-checkpoint-A-keyed",
        listener
      );

      // CASE 1: mono surface
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
        runKey: "key-a",
      });
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // CASE 2: multi surface still covering the same target surface
      coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
        runKey: "key-a",
      });
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();
    });

    it("should not react on new run targeting different surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState(
        "surface-mono-checkpoint-A-keyed",
        listener
      );

      // CASE 1: from initial state, unrelated run should not move this surface
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
      expect(listener).not.toHaveBeenCalled();
      listener.mockClear();

      // RESET to a finished run that does target the surface
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
        runKey: "key-a",
      });
      listener.mockClear();
      const readyHandle = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-A-keyed",
        runKey: "key-a",
      });
      assertNonNull(readyHandle);
      coordinator.signalReady(readyHandle);
      listener.mockClear();

      // CASE 2: after previous run completed, unrelated run should still not move it
      coordinator.startRun("scenario-mono-surface-multi-checkpoint-E-F");
      expect(listener).not.toHaveBeenCalled();
      listener.mockClear();
    });
  });
  describe("case end of run", () => {
    it("should react on run end targeting same surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState("surface-mono-checkpoint-B", listener);

      // CASE 1: mono surface
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle1 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-B",
      });
      assertNonNull(readyHandle1);
      coordinator.signalReady(readyHandle1);
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // CASE 2: multi surface
      coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
        runKey: "key-a",
      });
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle2 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-A-keyed",
        runKey: "key-a",
      });
      assertNonNull(readyHandle2);
      coordinator.signalReady(readyHandle2);
      expect(listener).not.toHaveBeenCalled();
      const readyHandle3 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-B",
      });
      assertNonNull(readyHandle3);
      coordinator.signalReady(readyHandle3);
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();
    });

    it("should not react before ALL checkpoint are ready for the target surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState(
        "surface-multi-checkpoint-C-D-keyed",
        listener
      );

      // CASE
      coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
        runKey: "key-a",
      });
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle1 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-C-keyed",
        runKey: "key-a",
      });
      assertNonNull(readyHandle1);
      coordinator.signalReady(readyHandle1);
      expect(listener).not.toHaveBeenCalled();
      const readyHandle2 = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-D-keyed",
        runKey: "key-a",
      });
      assertNonNull(readyHandle2);
      coordinator.signalReady(readyHandle2);
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();
    });

    it("should not react on run end targeting different surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState(
        "surface-mono-checkpoint-A-keyed",
        listener
      );

      // CASE
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
      listener.mockClear(); // reset because we don't test before this point
      const readyHandle = coordinator.getCurrentReadyHandle({
        checkpoint: "checkpoint-B",
      });
      assertNonNull(readyHandle);
      coordinator.signalReady(readyHandle);
      expect(listener).not.toHaveBeenCalled();
      listener.mockClear();
    });
  });
  describe("case interrupted", () => {
    it("should react on run interrupted targeting same surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState(
        "surface-mono-checkpoint-A-keyed",
        listener
      );

      // CASE
      coordinator.startRun("scenario-all", { runKey: "key-a" });
      listener.mockClear();
      coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
        runKey: "key-a",
      });
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();
    });

    it("should not react on run interrupted targeting different surface", () => {
      // SETUP
      const coordinator = createExhaustiveCoordinator();
      const listener = vi.fn();

      // TARGET
      coordinator.subscribeSurfaceState("surface-mono-checkpoint-B", listener);

      // CASE: interruption happens on surface A, not on surface B
      coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
        runKey: "key-a",
      });
      listener.mockClear();
      coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
        runKey: "key-a",
      });
      expect(listener).not.toHaveBeenCalled();
      listener.mockClear();
    });
  });

  it("should unsubscribe when explicitly called", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    const listener = vi.fn();
    const unsubscribe = coordinator.subscribeSurfaceState(
      "surface-mono-checkpoint-A-keyed",
      listener
    );

    // INITIALIZE
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
      runKey: "key-a",
    });
    expect(listener).toHaveBeenCalledTimes(1);
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
    expect(listener).toHaveBeenCalledTimes(2);

    // TRIGGER
    unsubscribe(); //! unsubscribe
    coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
      runKey: "key-a",
    });

    // ASSERT
    expect(listener).toHaveBeenCalledTimes(2); //! stop increasing
  });
});

describe("elapsed time logic", () => {
  it("should not have elapsed time initially", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();

    // ASSERT
    expect(
      coordinator.getSurfaceState("surface-mono-checkpoint-A-keyed")
    ).not.toHaveProperty("elapsedMs");
    expect(
      coordinator.getSurfaceState("surface-mono-checkpoint-B")
    ).not.toHaveProperty("elapsedMs");
    expect(
      coordinator.getSurfaceState("surface-multi-checkpoint-C-D-keyed")
    ).not.toHaveProperty("elapsedMs");
    expect(
      coordinator.getSurfaceState("surface-multi-checkpoint-E-F")
    ).not.toHaveProperty("elapsedMs");
  });

  it("should not have elapsed time for all never targeted yet surfaces", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25);

    // CASE
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
    const readyHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "checkpoint-B",
    });
    assertNonNull(readyHandle);
    coordinator.signalReady(readyHandle);

    // ASSERT
    expect(
      coordinator.getSurfaceState("surface-mono-checkpoint-A-keyed")
    ).not.toHaveProperty("elapsedMs");
    expect(
      coordinator.getSurfaceState("surface-multi-checkpoint-C-D-keyed")
    ).not.toHaveProperty("elapsedMs");
    expect(
      coordinator.getSurfaceState("surface-multi-checkpoint-E-F")
    ).not.toHaveProperty("elapsedMs");
  });

  it("should be 0 for all targeted surfaces when start run (even if Nth run)", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(40);

    // INITIALIZE
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-A-keyed", {
      runKey: "key-a",
    });
    const firstReadyHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "checkpoint-A-keyed",
      runKey: "key-a",
    });
    assertNonNull(firstReadyHandle);
    coordinator.signalReady(firstReadyHandle);
    expect(
      coordinator.getSurfaceState("surface-mono-checkpoint-A-keyed")
    ).toEqual({
      kind: "settled",
      hidden: false,
      scenario: "scenario-mono-surface-mono-checkpoint-A-keyed",
      interrupted: false,
      elapsedMs: 15,
    });

    // CASE
    coordinator.startRun("scenario-multi-surface-mono-checkpoint-A-B-keyed", {
      runKey: "key-a",
    });

    // ASSERT
    expect(
      coordinator.getSurfaceState("surface-mono-checkpoint-A-keyed")
    ).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "scenario-multi-surface-mono-checkpoint-A-B-keyed",
    });
    expect(coordinator.getSurfaceState("surface-mono-checkpoint-B")).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "scenario-multi-surface-mono-checkpoint-A-B-keyed",
    });
  });

  it("should not have elapsed time for targeted surfaces while ready signal isn't received for ALL checkpoints", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25);

    // CASE
    coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
      runKey: "key-a",
    });
    const firstReadyHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "checkpoint-C-keyed",
      runKey: "key-a",
    });
    assertNonNull(firstReadyHandle);
    coordinator.signalReady(firstReadyHandle);

    // ASSERT
    expect(
      coordinator.getSurfaceState("surface-multi-checkpoint-C-D-keyed")
    ).toEqual({
      kind: "pending",
      hidden: true,
      scenario: "scenario-mono-surface-multi-checkpoint-C-D-keyed",
    });
  });

  it("should reset interrupted surfaces elapsed time to 0", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(40)
      .mockReturnValueOnce(55);

    // INITIALIZE with a completed prior run so the surface had a non-zero value before
    coordinator.startRun("scenario-mono-surface-mono-checkpoint-B");
    const firstReadyHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "checkpoint-B",
    });
    assertNonNull(firstReadyHandle);
    coordinator.signalReady(firstReadyHandle);
    expect(coordinator.getSurfaceState("surface-mono-checkpoint-B")).toEqual({
      kind: "settled",
      hidden: false,
      scenario: "scenario-mono-surface-mono-checkpoint-B",
      interrupted: false,
      elapsedMs: 15,
    });

    // CASE: new unresolved run covers B, then another run interrupts and drops B
    coordinator.startRun("scenario-all", { runKey: "key-a" });
    coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
      runKey: "key-a",
    });

    // ASSERT
    expect(coordinator.getSurfaceState("surface-mono-checkpoint-B")).toEqual({
      kind: "settled",
      hidden: false,
      scenario: "scenario-mono-surface-multi-checkpoint-C-D-keyed",
      interrupted: true,
      elapsedMs: 0,
    });
  });

  it("should be equal last checkpoint ready time when all checkpoints ready", () => {
    // SETUP
    const coordinator = createExhaustiveCoordinator();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(70);

    // CASE
    coordinator.startRun("scenario-mono-surface-multi-checkpoint-C-D-keyed", {
      runKey: "key-a",
    });
    const firstReadyHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "checkpoint-C-keyed",
      runKey: "key-a",
    });
    assertNonNull(firstReadyHandle);
    coordinator.signalReady(firstReadyHandle);
    const secondReadyHandle = coordinator.getCurrentReadyHandle({
      checkpoint: "checkpoint-D-keyed",
      runKey: "key-a",
    });
    assertNonNull(secondReadyHandle);
    coordinator.signalReady(secondReadyHandle);

    // ASSERT
    expect(
      coordinator.getSurfaceState("surface-multi-checkpoint-C-D-keyed")
    ).toEqual({
      kind: "settled",
      hidden: false,
      scenario: "scenario-mono-surface-multi-checkpoint-C-D-keyed",
      interrupted: false,
      elapsedMs: 60,
    });
  });
});

describe("run completion listeners", () => {
  it("should emit run completion payload once all checkpoints are ready", () => {
    // SETUP
    const coordinator = createRealisticCoordinator();
    const completion = observeRealisticRunCompletion(coordinator);
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(30)
      .mockReturnValueOnce(40);

    // CASE
    coordinator.startRun("initial-load", { runKey: "thread-a" });
    const sidebarReady = coordinator.getCurrentReadyHandle({
      checkpoint: "sidebar-ready",
    });
    assertNonNull(sidebarReady);
    coordinator.signalReady(sidebarReady);
    const conversationReady = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-a",
    });
    assertNonNull(conversationReady);
    coordinator.signalReady(conversationReady);
    const promptReady = coordinator.getCurrentReadyHandle({
      checkpoint: "prompt-ready",
      runKey: "thread-a",
    });
    assertNonNull(promptReady);
    coordinator.signalReady(promptReady);

    // ASSERT
    expect(completion.events).toEqual([
      {
        scenario: "initial-load",
        runKey: "thread-a",
        elapsedMs: 30,
        targetedSurfaces: ["sidebar", "conversation"],
      },
    ]);
  });

  it("should not emit run completion payload for interrupted run", () => {
    // SETUP
    const coordinator = createRealisticCoordinator();
    const completion = observeRealisticRunCompletion(coordinator);

    // CASE
    coordinator.startRun("initial-load", { runKey: "thread-a" });
    coordinator.startRun("nav-to-session", { runKey: "thread-b" });

    // ASSERT
    expect(completion.events).toEqual([]);
  });

  it("should unsubscribe when explicitly called", () => {
    // SETUP
    const coordinator = createRealisticCoordinator();
    const listener = vi.fn();
    const unsubscribe = coordinator.subscribeRunCompletion(listener);

    // INITIALIZE
    coordinator.startRun("nav-to-session", { runKey: "thread-a" });
    const conversationReady = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-a",
    });
    assertNonNull(conversationReady);
    coordinator.signalReady(conversationReady);
    const promptReady = coordinator.getCurrentReadyHandle({
      checkpoint: "prompt-ready",
      runKey: "thread-a",
    });
    assertNonNull(promptReady);
    coordinator.signalReady(promptReady);
    expect(listener).toHaveBeenCalledTimes(1);

    // TRIGGER
    unsubscribe(); //! unsubscribe
    coordinator.startRun("nav-to-session", { runKey: "thread-b" });
    const nextConversationReady = coordinator.getCurrentReadyHandle({
      checkpoint: "conversation-ready",
      runKey: "thread-b",
    });
    assertNonNull(nextConversationReady);
    coordinator.signalReady(nextConversationReady);
    const nextPromptReady = coordinator.getCurrentReadyHandle({
      checkpoint: "prompt-ready",
      runKey: "thread-b",
    });
    assertNonNull(nextPromptReady);
    coordinator.signalReady(nextPromptReady);

    // ASSERT
    expect(listener).toHaveBeenCalledTimes(1); //! stop increasing
  });
});

describe("integration tests (real life scenarios)", () => {
  describe("initial to initial-load", () => {
    it("should trigger initial state update for target surface listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const sidebar = observeRealisticSurfaceState(coordinator, "sidebar");
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );

      // CASE
      coordinator.startRun("initial-load", { runKey: "thread-a" });

      // ASSERT
      expect(sidebar.events).toEqual([
        {
          kind: "pending",
          hidden: true,
          scenario: "initial-load",
        },
      ]);
      expect(conversation.events).toEqual([
        {
          kind: "pending",
          hidden: true,
          scenario: "initial-load",
        },
      ]);
    });

    it("should trigger initial ready-handle update for target checkpoint listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const sidebarHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "sidebar-ready",
      });
      const conversationHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "conversation-ready",
        runKey: "thread-a",
      });
      const promptHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "prompt-ready",
        runKey: "thread-a",
      });

      // CASE
      coordinator.startRun("initial-load", { runKey: "thread-a" });

      // ASSERT
      expect(sidebarHandle.events).toHaveLength(1);
      expect(sidebarHandle.events[0]).not.toBeNull();
      expect(conversationHandle.events).toHaveLength(1);
      expect(conversationHandle.events[0]).not.toBeNull();
      expect(promptHandle.events).toHaveLength(1);
      expect(promptHandle.events[0]).not.toBeNull();
    });

    it("should keep target surface state stable while not all checkpoints are ready", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const sidebar = observeRealisticSurfaceState(coordinator, "sidebar");
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      sidebar.events.length = 0;
      conversation.events.length = 0;

      // CASE
      const sidebarReady = coordinator.getCurrentReadyHandle({
        checkpoint: "sidebar-ready",
      });
      assertNonNull(sidebarReady);
      coordinator.signalReady(sidebarReady);
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-a",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);

      // ASSERT
      expect(sidebar.events).toEqual([]);
      expect(conversation.events).toEqual([]);
      expect(coordinator.getSurfaceState("sidebar")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "initial-load",
      });
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "initial-load",
      });
    });

    it("should trigger final state update for target surface listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const sidebar = observeRealisticSurfaceState(coordinator, "sidebar");
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );
      vi.spyOn(performance, "now")
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(20)
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(40);

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      sidebar.events.length = 0;
      conversation.events.length = 0;

      // CASE
      const sidebarReady = coordinator.getCurrentReadyHandle({
        checkpoint: "sidebar-ready",
      });
      assertNonNull(sidebarReady);
      coordinator.signalReady(sidebarReady);
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-a",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);
      const promptReady = coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-a",
      });
      assertNonNull(promptReady);
      coordinator.signalReady(promptReady);

      // ASSERT
      expect(sidebar.events).toEqual([
        {
          kind: "settled",
          hidden: false,
          scenario: "initial-load",
          interrupted: false,
          elapsedMs: 30,
        },
      ]);
      expect(conversation.events).toEqual([
        {
          kind: "settled",
          hidden: false,
          scenario: "initial-load",
          interrupted: false,
          elapsedMs: 30,
        },
      ]);
    });

    it("should trigger final ready-handle clear when ready", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const sidebarHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "sidebar-ready",
      });
      const conversationHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "conversation-ready",
        runKey: "thread-a",
      });
      const promptHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "prompt-ready",
        runKey: "thread-a",
      });

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      sidebarHandle.events.length = 0;
      conversationHandle.events.length = 0;
      promptHandle.events.length = 0;

      // CASE
      const sidebarReady = coordinator.getCurrentReadyHandle({
        checkpoint: "sidebar-ready",
      });
      assertNonNull(sidebarReady);
      coordinator.signalReady(sidebarReady);
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-a",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);
      const promptReady = coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-a",
      });
      assertNonNull(promptReady);
      coordinator.signalReady(promptReady);

      // ASSERT
      expect(sidebarHandle.events).toEqual([null]);
      expect(conversationHandle.events).toEqual([null]);
      expect(promptHandle.events).toEqual([null]);
    });
  });

  describe("initial-load to nav-to-session", () => {
    it("should interrupt initial-load if had not finished", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();

      // CASE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      // ASSERT
      expect(coordinator.getSurfaceState("sidebar")).toEqual({
        kind: "settled",
        hidden: false,
        scenario: "nav-to-session",
        interrupted: true,
        elapsedMs: 0,
      });
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "nav-to-session",
      });
    });

    it("should trigger initial state update for target surface listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      conversation.events.length = 0;

      // CASE
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      // ASSERT
      expect(conversation.events).toEqual([
        {
          kind: "pending",
          hidden: true,
          scenario: "nav-to-session",
        },
      ]);
    });

    it("should trigger initial ready-handle update for target checkpoint listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversationHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      const promptHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });

      // CASE
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      // ASSERT
      expect(conversationHandle.events).toHaveLength(1);
      expect(conversationHandle.events[0]).not.toBeNull();
      expect(promptHandle.events).toHaveLength(1);
      expect(promptHandle.events[0]).not.toBeNull();
    });

    it("should keep target surface stable while not all checkpoints are ready", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });
      conversation.events.length = 0;

      // CASE
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);

      // ASSERT
      expect(conversation.events).toEqual([]);
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "nav-to-session",
      });
    });

    it("should trigger final state update for target surface listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );
      vi.spyOn(performance, "now")
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(20)
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(50);

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });
      conversation.events.length = 0;

      // CASE
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);
      const promptReady = coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });
      assertNonNull(promptReady);
      coordinator.signalReady(promptReady);

      // ASSERT
      expect(conversation.events).toEqual([
        {
          kind: "settled",
          hidden: false,
          scenario: "nav-to-session",
          interrupted: false,
          elapsedMs: 30,
        },
      ]);
    });

    it("should trigger final ready-handle clear when ready", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversationHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      const promptHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });

      // INITIALIZE
      coordinator.startRun("initial-load", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });
      conversationHandle.events.length = 0;
      promptHandle.events.length = 0;

      // CASE
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);
      const promptReady = coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });
      assertNonNull(promptReady);
      coordinator.signalReady(promptReady);

      // ASSERT
      expect(conversationHandle.events).toEqual([null]);
      expect(promptHandle.events).toEqual([null]);
    });
  });

  describe("nav-to-session to nav-to-session", () => {
    it("should not interrupt previous nav-to-session if had not finished", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();

      // CASE
      coordinator.startRun("nav-to-session", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      // ASSERT
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "nav-to-session",
      });
    });

    it("should not trigger initial state update for target surface listeners when snapshot is unchanged", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );

      // INITIALIZE
      coordinator.startRun("nav-to-session", { runKey: "thread-a" });
      conversation.events.length = 0;

      // CASE
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      // ASSERT
      expect(conversation.events).toEqual([]);
    });

    it("should trigger initial ready-handle update for target checkpoint listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversationHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      const promptHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });

      // INITIALIZE
      coordinator.startRun("nav-to-session", { runKey: "thread-a" });

      // CASE
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });

      // ASSERT
      expect(conversationHandle.events).toHaveLength(1);
      expect(conversationHandle.events[0]).not.toBeNull();
      expect(promptHandle.events).toHaveLength(1);
      expect(promptHandle.events[0]).not.toBeNull();
    });

    it("should keep target surface stable while not all checkpoints are ready", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );

      // INITIALIZE
      coordinator.startRun("nav-to-session", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });
      conversation.events.length = 0;

      // CASE
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);

      // ASSERT
      expect(conversation.events).toEqual([]);
      expect(coordinator.getSurfaceState("conversation")).toEqual({
        kind: "pending",
        hidden: true,
        scenario: "nav-to-session",
      });
    });

    it("should trigger final state update for target surface listeners", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversation = observeRealisticSurfaceState(
        coordinator,
        "conversation"
      );
      vi.spyOn(performance, "now")
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(20)
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(45);

      // INITIALIZE
      coordinator.startRun("nav-to-session", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });
      conversation.events.length = 0;

      // CASE
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);
      const promptReady = coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });
      assertNonNull(promptReady);
      coordinator.signalReady(promptReady);

      // ASSERT
      expect(conversation.events).toEqual([
        {
          kind: "settled",
          hidden: false,
          scenario: "nav-to-session",
          interrupted: false,
          elapsedMs: 25,
        },
      ]);
    });

    it("should trigger final ready-handle clear when ready", () => {
      // SETUP
      const coordinator = createRealisticCoordinator();
      const conversationHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      const promptHandle = observeRealisticReadyHandle(coordinator, {
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });

      // INITIALIZE
      coordinator.startRun("nav-to-session", { runKey: "thread-a" });
      coordinator.startRun("nav-to-session", { runKey: "thread-b" });
      conversationHandle.events.length = 0;
      promptHandle.events.length = 0;

      // CASE
      const conversationReady = coordinator.getCurrentReadyHandle({
        checkpoint: "conversation-ready",
        runKey: "thread-b",
      });
      assertNonNull(conversationReady);
      coordinator.signalReady(conversationReady);
      const promptReady = coordinator.getCurrentReadyHandle({
        checkpoint: "prompt-ready",
        runKey: "thread-b",
      });
      assertNonNull(promptReady);
      coordinator.signalReady(promptReady);

      // ASSERT
      expect(conversationHandle.events).toEqual([null]);
      expect(promptHandle.events).toEqual([null]);
    });
  });
});
