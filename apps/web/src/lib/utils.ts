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

/**
 * This create a stable id generator from a any id generator function.
 *
 * @example
 * ```ts
 * const ids = createStableIdGenerator(nanoid);
 *
 * // lookup id
 * const a = ids.current;
 * const b = ids.current;
 * a === b // OK
 *
 * // consume id
 * const c = ids.consume();
 * a === b === c // OK return the previous id
 * const d = ids.current;
 * d !== c // then next one has been regenerated
 * ```
 *
 * @param createId:uuid generator function
 * @returns
 */
export function createStableIdGenerator<T>(createId: () => T) {
  let current = createId();

  return {
    get current() {
      return current;
    },
    consume() {
      const value = current;
      current = createId();
      return value;
    },
  };
}
