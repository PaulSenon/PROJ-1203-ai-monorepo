import { createEnv, type StandardSchemaV1 } from "@t3-oss/env-core";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & Record<never, never>;

type Schema = StandardSchemaV1;

type SecretSchema<TSchema extends Schema = Schema> = {
  readonly kind: "secret-schema";
  readonly schema: TSchema;
};

type PrivateField = Schema | SecretSchema<Schema>;

type BindingDefinition<Runtime, Kind extends string = string> = {
  readonly kind: Kind;
  readonly __runtime?: Runtime;
};

export type Secret<T> = {
  readonly type: "secret";
  readonly unencrypted: T;
};

export function asSecret<T>(value: T): Secret<T> {
  return {
    type: "secret",
    unencrypted: value,
  };
}

export function isSecret<T>(value: unknown): value is Secret<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "unencrypted" in value &&
    "type" in value &&
    value.type === "secret"
  );
}

export function unwrapSecret<T>(value: Secret<T> | T): T {
  if (isSecret<T>(value)) {
    return value.unencrypted;
  }

  return value;
}

export function secret<TSchema extends Schema>(
  schema: TSchema
): SecretSchema<TSchema> {
  return {
    kind: "secret-schema",
    schema,
  };
}

function isSecretSchema(value: PrivateField): value is SecretSchema<Schema> {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "secret-schema"
  );
}

type PrefixLiteral<TPrefix extends string> = string extends TPrefix
  ? never
  : TPrefix;

type InvalidPublicKeys<
  TPublic extends Record<string, Schema>,
  TPrefix extends string,
> = Exclude<Extract<keyof TPublic, string>, `${TPrefix}${string}`>;

type InvalidPrivateKeys<
  TPrivate extends Record<string, PrivateField>,
  TPrefix extends string,
> = Extract<Extract<keyof TPrivate, string>, `${TPrefix}${string}`>;

type EnforcePublicPrefix<
  TPublic extends Record<string, Schema>,
  TPrefix extends string,
> = InvalidPublicKeys<TPublic, TPrefix> extends never
  ? TPublic
  : {
      readonly __error_public_keys_must_start_with_prefix__: InvalidPublicKeys<
        TPublic,
        TPrefix
      >;
    };

type EnforcePrivatePrefix<
  TPrivate extends Record<string, PrivateField>,
  TPrefix extends string,
> = InvalidPrivateKeys<TPrivate, TPrefix> extends never
  ? TPrivate
  : {
      readonly __error_private_keys_cannot_start_with_public_prefix__: InvalidPrivateKeys<
        TPrivate,
        TPrefix
      >;
    };

type SchemaInput<TSchema extends Schema> = StandardSchemaV1.InferInput<TSchema>;

type SchemaOutput<TSchema extends Schema> =
  StandardSchemaV1.InferOutput<TSchema>;

type FieldInput<TField extends PrivateField> = TField extends SecretSchema<
  infer TSchema
>
  ? Secret<SchemaInput<TSchema>>
  : TField extends Schema
    ? SchemaInput<TField>
    : never;

type FieldOutput<TField extends PrivateField> = TField extends SecretSchema<
  infer TSchema
>
  ? SchemaOutput<TSchema>
  : TField extends Schema
    ? SchemaOutput<TField>
    : never;

type BindingRuntime<TBinding extends BindingDefinition<unknown, string>> =
  TBinding extends BindingDefinition<infer TRuntime, string> ? TRuntime : never;

export type InferBindingRuntimeMap<TContract extends ContractLike> = {
  [K in keyof TContract["bindings"]]: BindingRuntime<TContract["bindings"][K]>;
};

type ContractMeta<
  TPrivate extends Record<string, PrivateField>,
  TPublic extends Partial<Record<string, Schema>>,
  TBindings extends Record<string, BindingDefinition<unknown, string>>,
> = {
  readonly private: TPrivate;
  readonly public: TPublic;
  readonly bindings: TBindings;
};

type ContractLike = {
  readonly publicPrefix: string;
  readonly private: Record<string, PrivateField>;
  readonly public: Partial<Record<string, Schema>>;
  readonly bindings: Record<string, BindingDefinition<unknown, string>>;
};

export type AppEnvContractLike = ContractLike;

export type InferRuntimeEnv<TContract extends ContractLike> = Prettify<
  {
    [K in keyof TContract["private"]]: FieldOutput<TContract["private"][K]>;
  } & {
    [K in keyof TContract["public"]]: SchemaOutput<
      Exclude<TContract["public"][K], undefined>
    >;
  } & {
    [K in keyof TContract["bindings"]]: BindingRuntime<
      TContract["bindings"][K]
    >;
  }
>;

type DefaultInfraBindingMap<TContract extends ContractLike> = {
  [K in keyof TContract["bindings"]]: never;
};

export type InferInfraInput<
  TContract extends ContractLike,
  TInfraBindings extends Record<
    keyof TContract["bindings"],
    unknown
  > = DefaultInfraBindingMap<TContract>,
  TResolvedRuntimeBindings extends Record<
    keyof TContract["bindings"],
    unknown
  > = TInfraBindings,
> = Prettify<
  {
    [K in keyof TContract["private"]]: FieldInput<TContract["private"][K]>;
  } & {
    [K in keyof TContract["public"]]: SchemaInput<
      Exclude<TContract["public"][K], undefined>
    >;
  } & {
    [K in keyof TContract["bindings"]]: TResolvedRuntimeBindings[K] extends InferBindingRuntimeMap<TContract>[K]
      ? TInfraBindings[K]
      : never;
  }
>;

export type InferAppInput<TContract extends ContractLike> = Prettify<
  {
    [K in keyof TContract["private"]]: SchemaInput<
      TContract["private"][K] extends SecretSchema<infer TSchema>
        ? TSchema
        : Extract<TContract["private"][K], Schema>
    >;
  } & {
    [K in keyof TContract["public"]]: SchemaInput<
      Exclude<TContract["public"][K], undefined>
    >;
  } & {
    [K in keyof TContract["bindings"]]: BindingRuntime<
      TContract["bindings"][K]
    >;
  }
>;

type EmptyRecord = Record<never, never>;

type DefineOptions<
  TPublicPrefix extends string,
  TPrivate extends Record<string, PrivateField>,
  TPublic extends Record<string, Schema>,
  TBindings extends Record<string, BindingDefinition<unknown, string>>,
> = {
  readonly publicPrefix: PrefixLiteral<TPublicPrefix>;
  readonly private: EnforcePrivatePrefix<TPrivate, TPublicPrefix>;
  readonly public?: EnforcePublicPrefix<TPublic, TPublicPrefix>;
  readonly bindings?: TBindings;
};

type DefineDefaultOptions<
  TPrivate extends Record<string, PrivateField>,
  TPublic extends Record<string, Schema>,
  TBindings extends Record<string, BindingDefinition<unknown, string>>,
> = {
  readonly private: EnforcePrivatePrefix<TPrivate, "PUBLIC_">;
  readonly public?: EnforcePublicPrefix<TPublic, "PUBLIC_">;
  readonly bindings?: TBindings;
};

export function defineAppEnvContract<
  const TPrivate extends Record<string, PrivateField> = EmptyRecord,
  const TPublic extends Record<string, Schema> = EmptyRecord,
  const TBindings extends Record<
    string,
    BindingDefinition<unknown, string>
  > = EmptyRecord,
>(
  options: DefineDefaultOptions<TPrivate, TPublic, TBindings>
): {
  readonly publicPrefix: "PUBLIC_";
  readonly private: TPrivate;
  readonly public: TPublic;
  readonly bindings: TBindings;
};

export function defineAppEnvContract<
  const TPublicPrefix extends string,
  const TPrivate extends Record<string, PrivateField> = EmptyRecord,
  const TPublic extends Record<string, Schema> = EmptyRecord,
  const TBindings extends Record<
    string,
    BindingDefinition<unknown, string>
  > = EmptyRecord,
>(
  options: DefineOptions<TPublicPrefix, TPrivate, TPublic, TBindings>
): {
  readonly publicPrefix: TPublicPrefix;
  readonly private: TPrivate;
  readonly public: TPublic;
  readonly bindings: TBindings;
};

export function defineAppEnvContract<
  const TPublicPrefix extends string = "PUBLIC_",
  const TPrivate extends Record<string, PrivateField> = EmptyRecord,
  const TPublic extends Record<string, Schema> = EmptyRecord,
  const TBindings extends Record<
    string,
    BindingDefinition<unknown, string>
  > = EmptyRecord,
>(
  options:
    | DefineDefaultOptions<TPrivate, TPublic, TBindings>
    | DefineOptions<TPublicPrefix, TPrivate, TPublic, TBindings>
) {
  const publicPrefix =
    "publicPrefix" in options ? options.publicPrefix : "PUBLIC_";

  return {
    publicPrefix: publicPrefix as TPublicPrefix,
    private: options.private as TPrivate,
    public: (options.public ?? {}) as TPublic,
    bindings: (options.bindings ?? {}) as TBindings,
  } satisfies ContractMeta<TPrivate, TPublic, TBindings> & {
    readonly publicPrefix: TPublicPrefix;
  };
}

export function createAppEnv<
  const TContract extends ContractLike,
  const TRuntimeSource extends Record<string, unknown>,
>(
  contract: TContract,
  runtimeSource: TRuntimeSource
): Prettify<InferRuntimeEnv<TContract>> & Prettify<Readonly<TRuntimeSource>> {
  const serverSchemas = Object.fromEntries(
    Object.entries(contract.private)
      .map(([key, field]) => [
        key,
        isSecretSchema(field) ? field.schema : field,
      ])
      .filter(([_, value]) => value !== "") // Filter out empty strings
  ) as Record<string, Schema>;

  const clientSchemas = contract.public as Record<string, Schema>;

  const runtimeVars = Object.fromEntries(
    [...Object.keys(serverSchemas), ...Object.keys(clientSchemas)]
      .map((key) => [key, runtimeSource[key]])
      .filter(([_, value]) => value !== "") // Filter out empty strings
  ) as Record<string, string | boolean | number | undefined>;

  const parsedVars = createEnv({
    clientPrefix: contract.publicPrefix,
    server: serverSchemas,
    client: clientSchemas,
    runtimeEnv: runtimeVars,
    emptyStringAsUndefined: true,
  } as unknown as Parameters<typeof createEnv>[0]);

  const parsedBindings = Object.fromEntries(
    Object.keys(contract.bindings).map((key) => [key, runtimeSource[key]])
  );

  return Object.freeze({
    ...parsedVars,
    ...parsedBindings,
  }) as InferRuntimeEnv<TContract> & TRuntimeSource;
}

function customBinding<Runtime, const TKind extends string>(
  kind: TKind
): BindingDefinition<Runtime, TKind> {
  return { kind } as BindingDefinition<Runtime, TKind>;
}

export function binding<Runtime = unknown>(): BindingDefinition<
  Runtime,
  "binding"
>;
export function binding<
  Runtime = unknown,
  const TKind extends string = "binding",
>(kind: TKind): BindingDefinition<Runtime, TKind>;
export function binding<
  Runtime = unknown,
  const TKind extends string = "binding",
>(kind?: TKind): BindingDefinition<Runtime, TKind | "binding"> {
  const resolvedKind = (kind ?? "binding") as TKind | "binding";
  return customBinding<Runtime, TKind | "binding">(resolvedKind);
}
