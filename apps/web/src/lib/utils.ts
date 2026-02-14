import { type ClassValue, clsx } from "clsx";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type MaybePromise<T> = T | Promise<T>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export function mergeRefs<T>(...refs: Array<React.Ref<T> | null | undefined>) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<T | null>).current = element;
      }
    }
  };
}

export function useMergedRefs<T>(
  ...refs: Array<React.Ref<T> | null | undefined>
) {
  return useMemo(() => mergeRefs(...refs), [refs]);
}

/**
 * @example
 * ```ts
 * type Kind = 'a-kind' | 'b-kind';
 *
 * // will autocomplete and strictly allow literal values
 * function strict(kind: Kind);
 * strict('a-kind'); // OK
 * strict('something else'); // KO
 *
 * // will autocomplete but allow any string too
 * function loose(looseKind: WithAutocomplete<Kind>);
 * loose('a-kind'); // OK (with auto complete)
 * loose('something else'); // OK too
 * ```
 */
export type WithAutocomplete<T extends string> = T | (string & {});
