/** biome-ignore-all lint/suspicious/noExplicitAny: need any */
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  createProviderRegistry as __createProviderRegistry,
  type ProviderRegistryProvider,
} from "ai";
import type { MockProviderV2 } from "ai/test";
import z, { type ZodType } from "zod";

type ModelsRegistryParams = {
  GOOGLE_API_KEY: string;
  OPENAI_API_KEY: string;
};
export function createMyProviderRegistry(params: ModelsRegistryParams) {
  return __createProviderRegistry(
    {
      // register provider with prefix and default setup:
      google: createGoogleGenerativeAI({
        apiKey: params.GOOGLE_API_KEY,
      }),

      // register provider with prefix and custom setup:
      openai: createOpenAI({
        apiKey: params.OPENAI_API_KEY,
      }),
    },
    { separator: ":" }
  );
}

type MyProviderRegistry = ReturnType<typeof createMyProviderRegistry>;

export type InferProviderSplitChar<
  T extends ProviderRegistryProvider<any, any>,
> = T extends ProviderRegistryProvider<any, infer P> ? P : never;
type t4 = InferProviderSplitChar<MyProviderRegistry>;

export type InferProviders<T extends ProviderRegistryProvider<any, any>> =
  T extends ProviderRegistryProvider<infer P, any> ? P : never;
type t5 = InferProviders<MyProviderRegistry>;

// export type InferModelIdFromProvider<
//   T extends ProviderRegistryProvider<any, any>,
//   K extends keyof InferProviders<T>,
// > = Parameters<InferProviders<T>[K]["languageModel"]>[0];
// type t6 = InferModelIdFromProvider<TOTO, "google">;

type ExtractLiteralUnion<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

type InferAllLanguageModelFullIdForProvider<
  T extends ProviderRegistryProvider<Record<string, MockProviderV2>, string>,
  KEY,
> = KEY extends string
  ? `${KEY & string}${InferProviderSplitChar<T>}${ExtractLiteralUnion<
      Parameters<NonNullable<InferProviders<T>[KEY]["languageModel"]>>[0]
    >}`
  : never;
type t8 = InferAllLanguageModelFullIdForProvider<MyProviderRegistry, "openai">;

export type InferAllLanguageModelFullId<
  T extends ProviderRegistryProvider<Record<string, MockProviderV2>, string>,
> = InferAllLanguageModelFullIdForProvider<T, keyof InferProviders<T>>;
type t7 = InferAllLanguageModelFullId<MyProviderRegistry>;

// export type ExtractLanguageModelIds<
//   R extends ReturnType<typeof createProviderRegistry>,
// > = Parameters<InferProviders<R>[keyof InferProviders<R>]["languageModel"]>[0];
// type t = ExtractLanguageModelIds<ProviderRegistry>;

// export type ExtractLanguageModelIdsV2<
//   R extends ReturnType<typeof createProviderRegistry>,
// > = Parameters<InferProviders<R>[keyof InferProviders<R>]["languageModel"]>[0];
// type t2 = ExtractLanguageModelIdsV2<ProviderRegistry>;

// export type ExtractGenericModelId<
//   R extends ReturnType<typeof createProviderRegistry>,
// > = Parameters<R["languageModel"]>[0];

// type ProviderRegistry = ReturnType<typeof createModelsRegistry>;

// type t3 = keyof InferProviders<ProviderRegistry>;

const registryUtils = <const R extends ProviderRegistryProvider>() => ({
  createLanguageModelSubList<const T extends InferAllLanguageModelFullId<R>>(
    ids: T[] & InferAllLanguageModelFullId<R>[]
  ): T[] {
    return ids as T[];
  },
  createLanguageModelSubListValidator<
    const T extends InferAllLanguageModelFullId<R>,
  >(ids: T[] & InferAllLanguageModelFullId<R>[]): ZodType<T> {
    return z.custom<T>(
      (id: unknown): id is T => {
        if (typeof id !== "string") return false;
        return ids.includes(id as T);
      },
      {
        message: "Invalid language model id",
      }
    );
  },
});
function createLanguageModelConfig<const T extends string>(
  config: LanguageModelConfig<T>
): LanguageModelConfig<T> {
  return config;
}

export type LanguageModelConfig<T extends string> = {
  [K in T]: {
    id: K;
    label: string;
  };
};

export function createLanguageModelSubList<
  const R extends MyProviderRegistry,
  const T extends InferAllLanguageModelFullId<R>,
>(_registry: R, ids: T[] & InferAllLanguageModelFullId<R>[]): T[] {
  return ids as T[];
}

export function createLanguageModelSubListValidator<
  const R extends MyProviderRegistry,
  const T extends InferAllLanguageModelFullId<R>,
>(_registry: R, ids: T[] & InferAllLanguageModelFullId<R>[]): ZodType<T> {
  return z.custom<T>(
    (id: unknown): id is T => {
      if (typeof id !== "string") return false;
      return ids.includes(id as T);
    },
    {
      message: "Invalid language model id",
    }
  );
}

/**
 * THIS IS WHERE TO ADD / REMOVE MODEL IDS
 */
export const allowedModelIds =
  registryUtils<MyProviderRegistry>().createLanguageModelSubList([
    "openai:gpt-5-mini",
    "google:gemini-2.5-flash-lite",
  ]);
export const modelIdValidator =
  registryUtils<MyProviderRegistry>().createLanguageModelSubListValidator(
    allowedModelIds
  );

type GenericModelId = InferAllLanguageModelFullId<MyProviderRegistry>;
export type AllowedModelIds = (typeof allowedModelIds)[number] & GenericModelId;
export function isAllowedModelId(id: unknown): id is AllowedModelIds {
  return (
    typeof id === "string" &&
    allowedModelIds.some((allowedId) => allowedId === id)
  );
}

export const modelsConfig = createLanguageModelConfig<AllowedModelIds>({
  "openai:gpt-5-mini": {
    id: "openai:gpt-5-mini",
    label: "GPT-5 Mini",
  },
  "google:gemini-2.5-flash-lite": {
    id: "google:gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
  },
});

export const defaultModelId: AllowedModelIds = "openai:gpt-5-mini";
