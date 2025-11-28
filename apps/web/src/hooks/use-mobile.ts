import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

const IOS_USER_AGENT_REGEX = /iPad|iPhone|iPod/;
export function useIsIos() {
  const isMobile = useIsMobile();
  const [isIos, setIsIos] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const _isIos =
      isMobile &&
      (IOS_USER_AGENT_REGEX.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setIsIos(_isIos);
  }, [isMobile]);

  return !!isIos;
}
