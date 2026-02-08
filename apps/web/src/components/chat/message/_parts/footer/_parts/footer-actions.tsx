import { CheckIcon, EditIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CopyActionButton } from "@/components/ui-custom/primitives/copy-action-button";
import { IconActionButton } from "@/components/ui-custom/primitives/icon-action-button";
import { cn } from "@/lib/utils";
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

export function RetryAction({
  disabled,
  onAction,
}: {
  disabled?: boolean;
  onAction: MessageFooterActionHandler;
}) {
  return (
    <IconActionButton
      disabled={disabled}
      icon={<RotateCcwIcon />}
      label="Retry"
      onClick={() => onAction({ type: "retry" })}
      tooltip="Retry"
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

// TODO: tmp
export function UserFooterInlineEditor({
  className,
  initialText,
  onCancel,
  onSave,
}: {
  className?: string;
  initialText?: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState(initialText ?? "");

  useEffect(() => {
    setDraft(initialText ?? "");
  }, [initialText]);

  const trimmedDraft = useMemo(() => draft.trim(), [draft]);

  return (
    <form
      className={cn("flex w-full flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmedDraft.length === 0) {
          return;
        }
        onSave(trimmedDraft);
      }}
    >
      <Textarea
        className="min-h-16 text-xs"
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />
      <div className="flex items-center gap-1">
        <IconActionButton
          disabled={trimmedDraft.length === 0}
          icon={<CheckIcon />}
          label="Save"
          tooltip="Save"
          type="submit"
          variant="default"
        />
        <IconActionButton
          icon={<XIcon />}
          label="Cancel"
          onClick={onCancel}
          tooltip="Cancel"
          type="button"
          variant="ghost"
        />
      </div>
    </form>
  );
}
