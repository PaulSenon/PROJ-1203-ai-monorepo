import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type StatusMessageRootProps = ComponentProps<typeof Alert>;

export function StatusMessageRoot({
  className,
  ...props
}: StatusMessageRootProps) {
  return <Alert className={cn("flex flex-col gap-2", className)} {...props} />;
}

export type StatusMessageIconProps = ComponentProps<typeof Slot>;

export function StatusMessageIcon({
  className,
  ...props
}: StatusMessageIconProps) {
  return <Slot className={cn("size-4", className)} {...props} />;
}

export type StatusMessageHeaderProps = ComponentProps<"div">;

export function StatusMessageHeader({
  className,
  ...props
}: StatusMessageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

export type StatusMessageTitleProps = ComponentProps<typeof AlertTitle>;

export function StatusMessageTitle({
  className,
  ...props
}: StatusMessageTitleProps) {
  return <AlertTitle className={cn(className)} {...props} />;
}

export type StatusMessageContentProps = ComponentProps<"div">;

export function StatusMessageContent({
  className,
  ...props
}: StatusMessageContentProps) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

export type StatusMessageDescriptionProps = ComponentProps<
  typeof AlertDescription
>;

export function StatusMessageDescription({
  className,
  ...props
}: StatusMessageDescriptionProps) {
  return <AlertDescription className={cn(className)} {...props} />;
}

export type StatusMessageActionsProps = ComponentProps<"div">;

export function StatusMessageActions({
  className,
  ...props
}: StatusMessageActionsProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

export type StatusMessageFooterProps = ComponentProps<"div">;

export function StatusMessageFooter({
  className,
  ...props
}: StatusMessageFooterProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

export const StatusMessage = {
  Root: StatusMessageRoot,
  Header: StatusMessageHeader,
  Icon: StatusMessageIcon,
  Title: StatusMessageTitle,
  Content: StatusMessageContent,
  Description: StatusMessageDescription,
  Actions: StatusMessageActions,
  Footer: StatusMessageFooter,
};
