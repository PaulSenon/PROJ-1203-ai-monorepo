import { useScrollToBottomInit } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export function InitialScroll() {
  useScrollToBottomInit({
    enabled: true,
    skipIfVisible: false,
    settle: {
      maxFrames: 24,
      stableVisibleFrames: 2,
    },
    target: "bottom",
  });

  return null;
}
