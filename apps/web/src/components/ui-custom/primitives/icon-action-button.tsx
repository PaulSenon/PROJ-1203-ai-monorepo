import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui-custom/tooltip";

// TODO(ui-consistency): migrate sidebar/code-block icon actions to this primitive progressively.
export type IconActionButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  icon: ReactNode;
  label: string;
  tooltip?: string;
  tooltipMobile?: boolean;
};

export function IconActionButton({
  icon,
  label,
  tooltip,
  tooltipMobile = false,
  size = "icon-sm",
  type = "button",
  variant = "ghost",
  ...props
}: IconActionButtonProps) {
  return (
    <Tooltip asChild isMobile={tooltipMobile} tooltip={tooltip ?? label}>
      <Button size={size} type={type} variant={variant} {...props}>
        {icon}
        <span className="sr-only">{label}</span>
      </Button>
    </Tooltip>
  );
}
