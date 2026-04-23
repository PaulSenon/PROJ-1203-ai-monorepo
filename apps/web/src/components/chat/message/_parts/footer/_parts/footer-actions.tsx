import { EditIcon } from "lucide-react";
import { CopyActionButton } from "@/components/ui-custom/primitives/copy-action-button";
import { IconActionButton } from "@/components/ui-custom/primitives/icon-action-button";
import type { MessageFooterActionHandler } from "../footer.types";

export function CopyAction({
  disabled,
  onAction,
}: {
  disabled?: boolean;
  onAction: MessageFooterActionHandler;
}) {
  return (
    <CopyActionButton
      disabled={disabled}
      label="Copy"
      onCopy={() => onAction({ type: "copy", source: "raw-text" })}
      tooltip="Copy"
    />
  );
}

export function EditAction({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <IconActionButton
      disabled={disabled}
      icon={<EditIcon />}
      label="Edit"
      onClick={onClick}
      tooltip="Edit"
    />
  );
}
