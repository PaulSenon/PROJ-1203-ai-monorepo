import type {
  MutationOptions,
  OptionalRestArgsOrSkip,
  PaginatedQueryArgs,
  PaginatedQueryReference,
} from "convex/react";
import {
  type FunctionArgs,
  type FunctionReference,
  getFunctionName,
  type OptionalRestArgs,
} from "convex/server";
import { convexToJson, type Value } from "convex/values";

/**
 * @from "convex-helpers/react/cache/hooks"
 * Generate a query key from a query function and its arguments.
 * @param query Query function reference like api.foo.bar
 * @param args Arguments to the function, like { foo: "bar" }
 * @returns A string key that uniquely identifies the query and its arguments.
 */
export function createQueryKey<
  Fn extends FunctionReference<"query" | "mutation">,
>(fn: Fn, args: FunctionArgs<Fn>): string {
  const queryString = getFunctionName(fn);
  const key = [queryString, convexToJson(args)];
  const queryKey = JSON.stringify(key);
  return queryKey;
}

/**
 * Validate that the arguments to a Convex function are an object, defaulting
 * `undefined` to `{}`.
 */
export function parseArgs(
  args: Record<string, Value> | undefined
): Record<string, Value> {
  if (args === undefined) {
    return {};
  }
  if (!isSimpleObject(args)) {
    throw new Error(
      `The arguments to a Convex function must be an object. Received: ${
        args as unknown
      }`
    );
  }
  return args;
}

/**
 * Check whether a value is a plain old JavaScript object.
 */
export function isSimpleObject(value: unknown) {
  const isObject = typeof value === "object";
  const prototype = Object.getPrototypeOf(value);
  const isSimple =
    prototype === null ||
    prototype === Object.prototype ||
    // Objects generated from other contexts (e.g. across Node.js `vm` modules) will not satisfy the previous
    // conditions but are still simple objects.
    prototype?.constructor?.name === "Object";
  return isObject && isSimple;
}

/**
 * Typesafe query options utils
 */

type QueryOptions<TQuery extends FunctionReference<"query">> = [
  TQuery,
  ...OptionalRestArgs<TQuery>,
];
type QueryOptionsOrSkip<TQuery extends FunctionReference<"query">> = [
  TQuery,
  ...OptionalRestArgsOrSkip<TQuery>,
];

export function queryBuilder<TQuery extends FunctionReference<"query">>(
  query: TQuery
) {
  return (...args: OptionalRestArgs<TQuery>) => ({
    // options(skip?: "skip" | undefined): QueryOptionsOrSkip<TQuery> {
    //   return [query, ...(skip ? ["skip"] : args)] as QueryOptionsOrSkip<TQuery>;
    // },
    options: {
      skipWhen(
        doSkipUnknown: (() => boolean) | boolean
      ): QueryOptionsOrSkip<TQuery> {
        const doSkip =
          typeof doSkipUnknown === "function" ? doSkipUnknown() : doSkipUnknown;
        if (doSkip) return [query, ...["skip"]] as QueryOptionsOrSkip<TQuery>;
        return [query, ...args];
      },
      neverSkip(): QueryOptions<TQuery> {
        return [query, ...args];
      },
    },
    query,
    args,
  });
}

export function mutationBuilder<
  TMutation extends FunctionReference<"mutation">,
>(mutation: TMutation, options: MutationOptions<FunctionArgs<TMutation>>) {
  return (args: FunctionArgs<TMutation>) => ({
    options: (): [
      TMutation,
      FunctionArgs<TMutation>,
      MutationOptions<FunctionArgs<TMutation>>,
      // ...ArgsAndOptions<TMutation, MutationOptions<FunctionArgs<TMutation>>>,
    ] => [mutation, args, options],
    mutation,
    args,
    mutationOptions: options,
  });
}

type PaginatedQueryOptions<TQuery extends PaginatedQueryReference> = [
  TQuery,
  PaginatedQueryArgs<TQuery>,
  {
    initialNumItems: number;
    latestPageSize?: "grow" | "fixed";
  },
];
type PaginatedQueryOptionsOrSkip<TQuery extends PaginatedQueryReference> = [
  TQuery,
  PaginatedQueryArgs<TQuery> | "skip",
  {
    initialNumItems: number;
    latestPageSize?: "grow" | "fixed";
  },
];
export function paginatedQueryBuilder<
  const TQuery extends PaginatedQueryReference,
>(
  ...[query, paginationArgs]: [
    PaginatedQueryOptions<TQuery>[0],
    PaginatedQueryOptions<TQuery>[2],
  ]
) {
  return (args: PaginatedQueryOptions<TQuery>[1]) => ({
    options: {
      skipWhen(
        doSkipUnknown: (() => boolean) | boolean
      ): PaginatedQueryOptionsOrSkip<TQuery> {
        const doSkip =
          typeof doSkipUnknown === "function" ? doSkipUnknown() : doSkipUnknown;
        if (doSkip)
          return [
            query,
            ...["skip"],
            paginationArgs,
          ] as PaginatedQueryOptionsOrSkip<TQuery>;
        return [query, args, paginationArgs];
      },
      neverSkip(): PaginatedQueryOptionsOrSkip<TQuery> {
        return [query, args, paginationArgs];
      },
    },
    query,
    args,
    rawArgs: {
      ...args,
      paginationOpts: {
        id: undefined,
        endCursor: null,
        maximumRowsRead: undefined,
        maximumBytesRead: undefined,
        numItems: paginationArgs.initialNumItems,
        cursor: null,
      },
    },
  });
}

//{ paginationOpts: { id?: number | undefined; endCursor?: string | null | undefined; maximumRowsRead?: number | undefined; maximumBytesRead?: number | undefined; numItems: number; cursor: string | null; }; }'

/**
 * Debug playground
 */
// function toto() {
//   useQuery(api.chat.getThread, { threadUuid: "1234" });
//   const query1 = queryBuilder(api.chat.getThread, { threadUuid: "sfkljsdf" });
//   const data1 = useQuery(...query1.options.neverSkip());

//   usePaginatedQuery(api.chat.getThreadsForListing, {}, { initialNumItems: 50 });
//   const query2 = paginatedQueryBuilder(
//     api.chat.getThreadsForListing,
//     {},
//     { initialNumItems: 50 }
//   );
//   const data2 = usePaginatedQuery(...query2.options.skipWhen(true));
// }
