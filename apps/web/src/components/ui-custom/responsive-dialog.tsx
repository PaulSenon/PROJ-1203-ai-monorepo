"use client";

import type * as React from "react";
import { useCallback } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function ResponsiveDialog({
  children,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile();

  const handleMobileOpenChange = useCallback(
    (open: boolean) => {
      if (open && isMobile) {
        // weird hack so it does not break on ios when fully scroll down
        // this scroll top happens after the overflow clip of the dialog is applied
        // so it has absolutely no visual impact. It just fixes some weird layout issues.
        window.scrollTo({
          top: 0,
          behavior: "instant",
        });
      }
      onOpenChange?.(open);
    },
    [isMobile, onOpenChange]
  );

  return isMobile ? (
    <Drawer
      {...props}
      autoFocus={true}
      // disablePreventScroll={true}
      // preventScrollRestoration={true}
      onOpenChange={handleMobileOpenChange}
      // scrollLockTimeout={1000}
      repositionInputs={false}
    >
      {children}
    </Drawer>
  ) : (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {children}
    </Dialog>
  );
}

function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerTrigger {...props}>{children}</DrawerTrigger>
  ) : (
    <DialogTrigger {...props}>{children}</DialogTrigger>
  );
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <DrawerContent
        className={cn("flex h-screen max-h-screen flex-col", className)}
        {...props}
      >
        {children}
      </DrawerContent>
    );
  }
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerHeader className={className} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  );
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerTitle className={className} {...props} />
  ) : (
    <DialogTitle className={className} {...props} />
  );
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerDescription className={className} {...props} />
  ) : (
    <DialogDescription className={className} {...props} />
  );
}

function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile();
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
};
