import { useSmoothText } from "@convex-dev/agent/react";
import { Response } from "../ai-elements/response";

export function SmoothResponse({ children }: { children: React.ReactNode }) {
  const [text] = useSmoothText(children as string);
  return <Response>{text}</Response>;
}
