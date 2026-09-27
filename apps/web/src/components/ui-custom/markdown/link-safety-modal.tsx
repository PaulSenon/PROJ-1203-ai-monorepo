"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_TRUSTED_DOMAINS, resolveLinkKind } from "./link-policy";

export type LinkSafetyModalProps = {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trustedDomains?: string[];
};

function getLinkTrustLabel(url: string, trustedDomains: string[]) {
  const origin =
    typeof window === "undefined"
      ? "https://example.invalid"
      : window.location.origin;
  const kind = resolveLinkKind(url, origin, trustedDomains);

  if (kind === "external_trusted") {
    return "trusted";
  }

  return "untrusted";
}

export function LinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
  trustedDomains,
}: LinkSafetyModalProps) {
  const trustLabel = getLinkTrustLabel(
    url,
    trustedDomains ?? DEFAULT_TRUSTED_DOMAINS
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave this app?</DialogTitle>
          <DialogDescription>
            You are opening an external link marked as {trustLabel}.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs">
          {url}
        </p>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
