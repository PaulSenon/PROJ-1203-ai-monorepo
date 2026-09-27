import { SourceCache } from "./source-cache";
import { SourceDirectStream } from "./source-direct-stream";
import { SourcePersistedPaginated } from "./source-persisted-paginated";
import { SourceResumedStream } from "./source-resumed-stream";

export function MessageSourcesHost() {
  return (
    <>
      <MessageImperativeSourcesRuntime />
      <MessageReactSourcesHost />
    </>
  );
}

export function MessageReactSourcesHost() {
  return (
    <>
      <SourceCache />
      <SourcePersistedPaginated />
      <SourceResumedStream />
      <SourceDirectStream />
    </>
  );
}

export function MessageImperativeSourcesRuntime() {
  // Placeholder for plain TypeScript sources, workers, websocket clients, etc.
  // React owns only the lifecycle of this runtime.
  return null;
}
