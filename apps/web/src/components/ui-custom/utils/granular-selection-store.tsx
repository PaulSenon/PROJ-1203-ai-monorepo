"use client";

import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

/**
 * Performant selection store for when you need to have a heavy list of items <T>
 * and each item knows when it's selected without affecting other items.
 * while on a consumer side, we able to get/set the selected id.
 * or even attach to the selected item state.
 *
 * @example
 * Define your typed selection store once to get oll the hooks and components needed and typed.
 * You must also provide a getId function that for your item (<T>) it return a unique id.
 *
 * ```ts
 *   type MyItemType = {
 *     id: string;
 *     name: string;
 *   }
 *   const MySelectionStore = createSelectionStore<MyItemType>((item) => item.id);
 * ```
 *
 * Then you will be able for each of you item component, wrap with the created Item wrapper component
 * This will allow registering the item to the store (and unregistering when the item is unmounted)
 * Here you can also use the useIsSelected hook to know if the item is selected, we no extra rerender
 * on every other item (with different id).
 * You can also handle here the selection logic if needed, by using the setSelectedId mutation.
 * (or you can use it anywhere else, that's the whole point)
 *
 * ```tsx
 * function MyItem({ item, children }: { item: MyItemType; children: React.ReactNode }) {
 *   const isSelected = MySelectionStore.useIsSelected(item.id);
 *   const { setSelectedId } = MySelectionStore.useActions();
 *
 *   return (
 *     <MySelectionStore.Item
 *       data={item}
 *       className={cn(isSelected && "bg-accent")}
 *       onClick={() => setSelectedId(item.id)}
 *     >
 *       {children}
 *     </MySelectionStore.Item>
 *   );
 * }
 * ```
 *
 * Then anywhere else you need to react to selected item, you can just do something like this:
 *
 * ```tsx
 * function SomeComponent() {
 *   const selectedItem = MySelectionStore.useSelected();
 *   const {clear} = MySelectionStore.useActions();
 *
 *   if (!selectedItem) return (<div>No selected item</div>);
 *
 *   return (
 *     <div>
 *       Selected item: {selectedItem.name}
 *       <button onClick={clear}>Clear</button>
 *     </div>
 *   );
 * }
 * ```
 *
 *
 * For all this to work you will have to unsure that everything using any hook or component
 * are wrapped by the provider.
 *
 * ```tsx
 * <MySelectionStore.Provider>
 *   // your scoped components here
 * </MySelectionStore.Provider>
 * ```
 */
export function createSelectionStore<T>(getId: (data: T) => string) {
  type Store = ReturnType<typeof createStore>;

  function createStore() {
    let selectedId: string | null = null;
    const items = new Map<string, T>();

    // listeners
    const idListeners = new Set<() => void>(); // selectedId changes
    const selectedItemListeners = new Set<() => void>(); // selected item changes (id or data update)
    const perIdListeners = new Map<string, Set<() => void>>(); // isSelected(id)

    const emit = (set?: Set<() => void>) => {
      if (!set) return;
      for (const l of set) l();
    };

    const get = (id: string) => items.get(id) ?? null;
    const getSelectedId = () => selectedId;
    const getIsSelected = (id: string) => selectedId === id;
    const getSelected = () =>
      selectedId ? (items.get(selectedId) ?? null) : null;

    const setSelectedId = (next: string | null) => {
      if (next === selectedId) return;

      const prev = selectedId;
      selectedId = next;

      emit(idListeners);
      emit(selectedItemListeners);

      if (prev) emit(perIdListeners.get(prev));
      if (next) emit(perIdListeners.get(next));
    };

    const upsertItem = (id: string, data: T) => {
      const prev = items.get(id);
      if (prev === data) return;

      items.set(id, data);

      // only the menu / selected-item consumers should update
      if (id === selectedId) emit(selectedItemListeners);
    };

    const removeItem = (id: string) => {
      const existed = items.delete(id);
      if (!existed) return;

      // if the selected item disappears, clear selection
      if (id === selectedId) setSelectedId(null);
    };

    const subscribeSelectedId = (l: () => void) => {
      idListeners.add(l);
      return () => idListeners.delete(l);
    };

    const subscribeSelectedItem = (l: () => void) => {
      selectedItemListeners.add(l);
      return () => selectedItemListeners.delete(l);
    };

    const subscribeIsSelected = (id: string, l: () => void) => {
      const set = perIdListeners.get(id) ?? new Set<() => void>();
      if (!perIdListeners.has(id)) perIdListeners.set(id, set);

      set.add(l);
      return () => {
        const cur = perIdListeners.get(id);
        if (!cur) return;
        cur.delete(l);
        if (cur.size === 0) perIdListeners.delete(id);
      };
    };

    return {
      // state getters
      get,
      getSelectedId,
      getSelected,
      getIsSelected,

      // mutations
      setSelectedId,
      upsertItem,
      removeItem,

      // subs
      subscribeSelectedId,
      subscribeSelectedItem,
      subscribeIsSelected,
    };
  }

  const Ctx = createContext<Store | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const ref = useRef<Store>(null);
    if (!ref.current) ref.current = createStore();
    return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
  }

  function useStore() {
    const store = useContext(Ctx);
    if (!store) throw new Error("Selection Provider missing");
    return store;
  }

  function useSelectedId() {
    const store = useStore();
    return useSyncExternalStore(
      store.subscribeSelectedId,
      store.getSelectedId,
      store.getSelectedId
    );
  }

  function useSelected() {
    const store = useStore();
    return useSyncExternalStore(
      store.subscribeSelectedItem,
      store.getSelected,
      store.getSelected
    );
  }

  function useIsSelected(id: string) {
    const store = useStore();
    return useSyncExternalStore(
      (cb) => store.subscribeIsSelected(id, cb),
      () => store.getIsSelected(id),
      () => store.getIsSelected(id)
    );
  }

  function useActions() {
    const store = useStore();
    return useMemo(
      () => ({
        setSelectedId: store.setSelectedId,
        clear: () => store.setSelectedId(null),
        get: (id: string) => store.get(id),
      }),
      [store]
    );
  }

  // TODO this renders div. Could implement asChild or render pattern...
  function Item({
    data,
    children,
    asChild,
    ...props
  }: {
    data: T;
    children: ReactNode;
    asChild?: boolean;
  } & HTMLAttributes<HTMLDivElement>) {
    const store = useStore();
    const id = getId(data);

    useLayoutEffect(() => {
      store.upsertItem(id, data);
      return () => store.removeItem(id);
    }, [store, id, data]);

    if (asChild) {
      return <Slot {...props}>{children}</Slot>;
    }

    return <div {...props}>{children}</div>;
  }

  return {
    Provider,
    Item,
    useSelectedId,
    useSelected,
    useIsSelected,
    useActions,
  } as const;
}
