import { useScrollToBottomInit } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export function InitialScroll() {
  useScrollToBottomInit({
    enabled: true,
    skipIfVisible: false,
    target: "bottom",
  });

  return null;
}
