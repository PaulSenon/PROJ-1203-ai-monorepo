import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconActionButton,
  type IconActionButtonProps,
} from "./icon-action-button";

type OnCopyResult = undefined | boolean | Promise<undefined | boolean>;

export type CopyActionButtonProps = Omit<
  IconActionButtonProps,
  "icon" | "label" | "onClick"
> & {
  copiedLabel?: string;
  label?: string;
  onCopy: () => OnCopyResult;
  timeout?: number;
};

export function CopyActionButton({
  copiedLabel = "Copied",
  label = "Copy",
  onCopy,
  timeout = 2000,
  tooltip,
  ...props
}: CopyActionButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cleanup = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    return cleanup;
  }, []);

  const handleCopy = useCallback(async () => {
    const result = await onCopy();
    if (result === false) {
      return;
    }

    setIsCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, timeout);
  }, [onCopy, timeout]);

  return (
    <IconActionButton
      icon={
        <span className="relative size-3.5">
          <CopyIcon
            className={cn(
              "absolute inset-0 size-3.5 transition-all duration-200",
              isCopied ? "scale-0 opacity-0" : "scale-100 opacity-100"
            )}
          />
          <CheckIcon
            className={cn(
              "absolute inset-0 size-3.5 transition-all duration-200",
              isCopied ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
          />
        </span>
      }
      label={isCopied ? copiedLabel : label}
      onClick={handleCopy}
      tooltip={isCopied ? copiedLabel : (tooltip ?? label)}
      {...props}
    />
  );
}
