import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UserProfileButton } from "@/components/auth/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useFpsThrottledValueDEBUG } from "@/hooks/utils/use-fps-throttled-state";
import { orpc } from "@/utils/orpc/orpc";
// import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function useFastCounter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + 1);
    }, 1);
    return () => clearInterval(interval);
  }, []);
  return count;
}

const ThrottledContext = createContext<{
  throttledCount: number;
  debug: {
    lastUpdateTime: number;
    framesSinceLastUpdate: number;
    timeSinceLastUpdate: number;
    nbProcessedUpdates: number;
    nbRequestedUpdates: number;
    fps: number;
  };
}>({
  throttledCount: 0,
  debug: {
    lastUpdateTime: 0,
    framesSinceLastUpdate: 0,
    timeSinceLastUpdate: 0,
    nbProcessedUpdates: 0,
    nbRequestedUpdates: 0,
    fps: 0,
  },
});

const ThrottledProvider = ({ children }: { children: ReactNode }) => {
  const fastCounter = useFastCounter(); // The noisy hook
  const [throttledCount, throttler] = useFpsThrottledValueDEBUG(fastCounter, {
    maxFps: 3,
    fpsFactor: 1 / 2,
  });

  const debug = useRef<{
    lastUpdateTime: number;
    framesSinceLastUpdate: number;
    timeSinceLastUpdate: number;
    nbProcessedUpdates: number;
    nbRequestedUpdates: number;
    fps: number;
  }>({
    lastUpdateTime: 0,
    framesSinceLastUpdate: 0,
    timeSinceLastUpdate: 0,
    nbProcessedUpdates: 0,
    nbRequestedUpdates: 0,
    fps: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (throttler.debugState) {
        debug.current = {
          ...throttler.debugState,
          fps: Math.round(1000 / throttler.debugState.timeSinceLastUpdate),
        };
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [throttler]);

  const value = useMemo(
    () => ({
      throttledCount,
      debug: debug.current,
    }),
    [throttledCount]
  );

  return (
    <ThrottledContext.Provider value={value}>
      {children}
    </ThrottledContext.Provider>
  );
};

function useThrottled() {
  const context = useContext(ThrottledContext);
  if (!context) {
    throw new Error("useThrottled must be used within a ThrottledProvider");
  }
  return context;
}

function DebugThrottledState() {
  const { throttledCount, debug } = useThrottled();

  const rerenderCount = useRef(0);
  rerenderCount.current += 1;

  return (
    <div>
      {/* <ThrottledCounterBridge onUpdate={setThrottled} /> */}
      <p>Throttled Count: {throttledCount}</p>
      <div className="rounded-md border p-2">
        <h2 className="font-medium text-lg">Debug stats:</h2>
        <p>Requested Updates: {debug.nbRequestedUpdates}</p>
        <p>Processed Updates: {debug.nbProcessedUpdates}</p>
        <p>FPS: {debug.fps}</p>
        <p>Rerenders: {rerenderCount.current}</p>
      </div>
    </div>
  );
}

function HomeComponent() {
  const auth = useAuth();
  const publicCheck = useQuery(orpc.public.greeting.queryOptions());
  const protectedCheck = useQuery(orpc.private.greeting.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <header className="min-h-10">
        <UserProfileButton />
      </header>
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <ThrottledProvider>
        <DebugThrottledState />
      </ThrottledProvider>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <p> {auth.status}</p>
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${publicCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {publicCheck.isLoading
                ? "Checking..."
                : publicCheck.data
                  ? publicCheck.data.text
                  : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${protectedCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {protectedCheck.isLoading
                ? "Checking..."
                : protectedCheck.data
                  ? protectedCheck.data.text
                  : "Disconnected"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
