import { useScrollToBottomInit } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export function InitialScroll() {
  useScrollToBottomInit({
    enabled: true,
    target: "bottom",
  });

  return null;
}
