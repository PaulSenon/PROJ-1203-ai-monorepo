import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createControllablePromise } from "@/helpers/controllable-promise-helper";

export const appLoadPromise = createControllablePromise<void>();

type AppLoadStatusState = {
  isSidebarUIReady: boolean;
  isActiveThreadUIReady: boolean;
  isInputUIReady: boolean;
  isInitialUIStateReady: boolean;
};

type AppLoadStatusActions = {
  setSidebarUIReady: () => void;
  setActiveThreadUIReady: (isReady: boolean) => void;
  setInputUIReady: (isReady: boolean) => void;
};

const AppLoadStatusContext = createContext<AppLoadStatusState | null>(null);
const AppLoadStatusActionsContext = createContext<AppLoadStatusActions | null>(
  null
);

export function AppLoadStatusProvider({ children }: { children: ReactNode }) {
  // UI zone load states
  const [isSidebarUIReady, _setIsSidebarUIReady] = useState(false);
  const [isActiveThreadUIReady, _setIsActiveThreadUIReady] = useState(false);
  const [isInputUIReady, _setIsInputUIReady] = useState(false);

  // compound initial load states
  const isInitialUIStateReady = useRef(false);
  if (
    !isInitialUIStateReady.current &&
    isSidebarUIReady &&
    isActiveThreadUIReady
  ) {
    console.log("====================== APP READY =========================");
    isInitialUIStateReady.current = true;
  }

  // suspend load promise when loading critical stuff
  // 1. initial load
  // 2. active thread + input
  if (
    isInitialUIStateReady.current &&
    isActiveThreadUIReady &&
    isInputUIReady
  ) {
    appLoadPromise.resolve();
  } else {
    appLoadPromise.suspend();
  }

  const appLoadStatusState: AppLoadStatusState = useMemo(
    () => ({
      isSidebarUIReady,
      isActiveThreadUIReady,
      isInputUIReady,
      isInitialUIStateReady: isInitialUIStateReady.current,
    }),
    [isSidebarUIReady, isActiveThreadUIReady, isInputUIReady]
  );

  const appLoadStatusActions: AppLoadStatusActions = useMemo(
    () => ({
      // setAuthLoaded: () => _setIsAuthLoading(false),
      setSidebarUIReady: () => _setIsSidebarUIReady(true),
      setActiveThreadUIReady: (isReady = true) =>
        _setIsActiveThreadUIReady(isReady),
      setInputUIReady: (isReady = true) => _setIsInputUIReady(isReady),
    }),
    []
  );

  return (
    <AppLoadStatusContext.Provider value={appLoadStatusState}>
      <AppLoadStatusActionsContext.Provider value={appLoadStatusActions}>
        {children}
      </AppLoadStatusActionsContext.Provider>
    </AppLoadStatusContext.Provider>
  );
}

export function useAppLoadStatus() {
  const appLoadStatusState = useContext(AppLoadStatusContext);
  if (!appLoadStatusState) {
    throw new Error(
      "useAppLoadStatus must be used within an AppLoadStatusProvider"
    );
  }
  return appLoadStatusState;
}

export function useAppLoadStatusActions() {
  const appLoadStatusActions = useContext(AppLoadStatusActionsContext);
  if (!appLoadStatusActions) {
    throw new Error(
      "useAppLoadStatusActions must be used within an AppLoadStatusProvider"
    );
  }
  return appLoadStatusActions;
}
