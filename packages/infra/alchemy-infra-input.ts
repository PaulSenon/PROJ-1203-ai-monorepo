import type {
  Binding as AlchemyBinding,
  Bound as AlchemyBound,
} from "alchemy/cloudflare";
import type {
  AppEnvContractLike,
  InferInfraInput,
} from "../env/src/app-env.ts";

type InferAlchemyBoundRuntime<
  TInfraBindings extends Record<string, AlchemyBinding>,
> = {
  [K in keyof TInfraBindings]: AlchemyBound<TInfraBindings[K]>;
};

export type InferAlchemyInfraInput<
  TContract extends AppEnvContractLike,
  TInfraBindings extends Record<
    keyof TContract["bindings"],
    AlchemyBinding
  > = Record<keyof TContract["bindings"], never>,
> = InferInfraInput<
  TContract,
  TInfraBindings,
  InferAlchemyBoundRuntime<TInfraBindings>
>;
