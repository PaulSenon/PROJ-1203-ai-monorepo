import { useMatchRoute, useParams, useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import z from "zod";
import { useUserCacheEntry } from "@/hooks/use-user-cache";
import { Button } from "../ui/button";

export type DebugContextType = {
  messages: string[];
  id: string;
  isNew: boolean;
  sendMessage: (message: string) => void;
  openExisting: (id: string) => void;
  openNew: () => void;
};

export const DebugContext = createContext<DebugContextType | null>(null);

export function DebugContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams({ strict: false });
  const isNew = !params.id;
  const id = useMemo(() => params.id ?? nanoid(), [params.id]);

  const messagesCache = useUserCacheEntry(
    `messages-${id}`,
    z.array(z.string())
  );

  // const params2 = ChatRoute.useParams();
  const match = useMatchRoute();

  // TODO: This is weird, when transitioning from / to /id there is like two renders where match is false
  const paramsBroken = match({ to: "/chat/{-$id}" });
  const paramsBroken2 = match({ to: "/chat/{-$id}", pending: true });
  useEffect(() => {
    console.log("--------------------------------");
    // console.log("paramsFromRoute", params2);
    console.log("paramsFromMatch", paramsBroken);
    console.log("paramsFromMatchPending", paramsBroken2);
    console.log("--------------------------------");
  }, [paramsBroken, paramsBroken2]);

  const sendMessage = useCallback(
    (message: string) => {
      if (isNew) {
        router.navigate({
          replace: true,
          to: "/chat/{-$id}",
          params: { id },
        });
      }
      messagesCache.set([...(messagesCache.data ?? []), message]);
    },
    [id, isNew, router, messagesCache.data, messagesCache.set]
  );

  const openNew = useCallback(() => {
    router.navigate({
      to: "/chat/{-$id}",
      params: { id: undefined },
    });
  }, [router]);

  const openExisting = useCallback(
    (targetId: string) => {
      router.navigate({
        to: "/chat/{-$id}",
        params: { id: targetId },
      });
    },
    [router]
  );

  return (
    <DebugContext.Provider
      value={{
        messages: messagesCache.data ?? [],
        sendMessage,
        openExisting,
        openNew,
        id,
        isNew,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within DebugContextProvider");
  }
  return context;
}

export function Debug() {
  // const maybeUserId = use(lastLoggedInUserId.get());
  const { id, isNew, messages, openExisting, openNew } = useDebug();
  return (
    <div className="flex flex-col">
      <div>
        "{id}" {isNew ? "NEW" : "existing"}
        <Button onClick={() => openExisting(nanoid())}>exiting</Button>
        <Button onClick={() => openNew()}>new</Button>
      </div>
      <Messages messages={messages} />
      <Input />
    </div>
  );
}

function Message({ message }: { message: string }) {
  return <span className="border-2 border-amber-500 p-5">{message}</span>;
}

function Messages({ messages }: { messages: string[] }) {
  return (
    <div className="flex flex-col">
      {messages.map((m) => (
        <Message key={m} message={m} />
      ))}
    </div>
  );
}

function Input() {
  const { sendMessage } = useDebug();
  const [value, setValue] = useState("");
  const handleSubmit = () => {
    sendMessage(value);
    setValue("");
  };
  return (
    <div className="bg-amber-950">
      <input
        onChange={(e) => setValue(e.target.value)}
        type="text"
        value={value}
      />
      <Button onClick={handleSubmit}>submit</Button>
    </div>
  );
}
