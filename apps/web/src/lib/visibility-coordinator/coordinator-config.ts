export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type VisibilitySurfaceConfig<TCheckpointId extends string = string> = {
  keyed?: true;
  initialHidden?: boolean;
  checkpoints: NonEmptyReadonlyArray<TCheckpointId>;
};

export type VisibilityScenarioConfig<TSurfaceId extends string = string> = {
  surfaces: NonEmptyReadonlyArray<TSurfaceId>;
};

export type VisibilitySpec = {
  surfaces: Record<string, VisibilitySurfaceConfig>;
  scenarios: Record<string, VisibilityScenarioConfig>;
};

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type SimplifyUnion<T> = T extends unknown ? Simplify<T> : never;

type CoordinatorSpecShape<
  TSurfaces extends Record<string, VisibilitySurfaceConfig>,
  TScenarios extends Record<
    string,
    VisibilityScenarioConfig<keyof TSurfaces & string>
  >,
> = {
  surfaces: TSurfaces;
  scenarios: TScenarios;
};

export type SurfaceIdFromSpec<TSpec extends VisibilitySpec> =
  keyof TSpec["surfaces"] & string;

export type ScenarioIdFromSpec<TSpec extends VisibilitySpec> =
  keyof TSpec["scenarios"] & string;

export type KeyedSurfaceIdFromSpec<TSpec extends VisibilitySpec> = {
  [TSurfaceId in SurfaceIdFromSpec<TSpec>]: TSpec["surfaces"][TSurfaceId]["keyed"] extends true
    ? TSurfaceId
    : never;
}[SurfaceIdFromSpec<TSpec>];

export type ScenarioSurfaceIdFromSpec<
  TSpec extends VisibilitySpec,
  TScenarioId extends ScenarioIdFromSpec<TSpec>,
> = TSpec["scenarios"][TScenarioId]["surfaces"][number] & string;

export type CheckpointIdFromSpec<TSpec extends VisibilitySpec> = {
  [TSurfaceId in SurfaceIdFromSpec<TSpec>]: TSpec["surfaces"][TSurfaceId]["checkpoints"][number] &
    string;
}[SurfaceIdFromSpec<TSpec>];

export type ScenarioCheckpointIdFromSpec<
  TSpec extends VisibilitySpec,
  TScenarioId extends ScenarioIdFromSpec<TSpec>,
> = {
  [TSurfaceId in ScenarioSurfaceIdFromSpec<
    TSpec,
    TScenarioId
  >]: TSpec["surfaces"][TSurfaceId]["checkpoints"][number] & string;
}[ScenarioSurfaceIdFromSpec<TSpec, TScenarioId>];

export type KeyedCheckpointIdFromSpec<TSpec extends VisibilitySpec> = {
  [TSurfaceId in KeyedSurfaceIdFromSpec<TSpec>]: TSpec["surfaces"][TSurfaceId]["checkpoints"][number] &
    string;
}[KeyedSurfaceIdFromSpec<TSpec>];

export type ReadySignalInputFromSpec<TSpec extends VisibilitySpec> = {
  [TCheckpointId in CheckpointIdFromSpec<TSpec>]: TCheckpointId extends KeyedCheckpointIdFromSpec<TSpec>
    ? { checkpoint: TCheckpointId; runKey: string }
    : { checkpoint: TCheckpointId };
}[CheckpointIdFromSpec<TSpec>];

export type ScenarioNeedsRunKeyFromSpec<TSpec extends VisibilitySpec> = {
  [TScenarioId in ScenarioIdFromSpec<TSpec>]: Extract<
    ScenarioSurfaceIdFromSpec<TSpec, TScenarioId>,
    KeyedSurfaceIdFromSpec<TSpec>
  > extends never
    ? never
    : TScenarioId;
}[ScenarioIdFromSpec<TSpec>];

export type StartRunArgs<
  TScenarioId extends string,
  TScenarioNeedsRunKey extends TScenarioId,
> =
  | {
      [TScenario in Exclude<TScenarioId, TScenarioNeedsRunKey>]: [
        scenario: TScenario,
      ];
    }[Exclude<TScenarioId, TScenarioNeedsRunKey>]
  | {
      [TScenario in TScenarioNeedsRunKey]: [
        scenario: TScenario,
        args: { runKey: string },
      ];
    }[TScenarioNeedsRunKey];

export type StartRunArgsFromSpec<TSpec extends VisibilitySpec> = StartRunArgs<
  ScenarioIdFromSpec<TSpec>,
  ScenarioNeedsRunKeyFromSpec<TSpec>
>;

declare const VisibilitySpecTypesBrand: unique symbol;

type ResolvedCoordinatorTypes<
  TSurfaceId extends string,
  TScenarioId extends string,
  TCheckpointId extends string,
  TReadySignalInput,
  TScenarioNeedsRunKey extends TScenarioId,
> = {
  surfaceId: TSurfaceId;
  scenarioId: TScenarioId;
  checkpointId: TCheckpointId;
  readySignalInput: TReadySignalInput;
  scenarioNeedsRunKey: TScenarioNeedsRunKey;
};

type ResolvedFromShape<
  TSurfaces extends Record<string, VisibilitySurfaceConfig>,
  TScenarios extends Record<
    string,
    VisibilityScenarioConfig<keyof TSurfaces & string>
  >,
> = ResolvedCoordinatorTypes<
  keyof TSurfaces & string,
  keyof TScenarios & string,
  CheckpointIdFromSpec<CoordinatorSpecShape<TSurfaces, TScenarios>>,
  ReadySignalInputFromSpec<CoordinatorSpecShape<TSurfaces, TScenarios>>,
  ScenarioNeedsRunKeyFromSpec<CoordinatorSpecShape<TSurfaces, TScenarios>>
>;

export type BuiltCoordinatorSpec<
  TSurfaces extends Record<string, VisibilitySurfaceConfig>,
  TScenarios extends Record<
    string,
    VisibilityScenarioConfig<keyof TSurfaces & string>
  >,
> = CoordinatorSpecShape<TSurfaces, TScenarios> & {
  readonly [VisibilitySpecTypesBrand]: ResolvedFromShape<TSurfaces, TScenarios>;
};

export type AnyBuiltCoordinatorSpec = VisibilitySpec & {
  readonly [VisibilitySpecTypesBrand]: ResolvedCoordinatorTypes<
    string,
    string,
    string,
    { checkpoint: string; runKey?: string },
    string
  >;
};

type ResolvedOf<TSpec extends AnyBuiltCoordinatorSpec> =
  TSpec[typeof VisibilitySpecTypesBrand];

export type InferSurfaceId<TSpec extends AnyBuiltCoordinatorSpec> =
  ResolvedOf<TSpec>["surfaceId"];

export type InferScenarioId<TSpec extends AnyBuiltCoordinatorSpec> =
  ResolvedOf<TSpec>["scenarioId"];

export type InferReadySignalInput<TSpec extends AnyBuiltCoordinatorSpec> =
  SimplifyUnion<ResolvedOf<TSpec>["readySignalInput"]>;

export type InferScenarioNeedsRunKey<TSpec extends AnyBuiltCoordinatorSpec> =
  ResolvedOf<TSpec>["scenarioNeedsRunKey"];

export type InferCheckpointId<TSpec extends AnyBuiltCoordinatorSpec> =
  ResolvedOf<TSpec>["checkpointId"];

/**
 * @example
 * ```ts
 * const specs = createCoordinatorSpecs({
 *   surfaces: {
 *     toto: {
 *       checkpoints: ["tata"],
 *     },
 *   },
 *   scenarios: {
 *     titi: {
 *       surfaces: ["toto"],
 *     },
 *   },
 * });
 * ```
 */
export function createCoordinatorSpecs<
  const TSurfaces extends Record<string, VisibilitySurfaceConfig>,
  const TScenarios extends Record<
    string,
    VisibilityScenarioConfig<keyof TSurfaces & string>
  >,
>(
  specs: CoordinatorSpecShape<TSurfaces, TScenarios>
): BuiltCoordinatorSpec<TSurfaces, TScenarios> {
  return specs as BuiltCoordinatorSpec<TSurfaces, TScenarios>;
}
