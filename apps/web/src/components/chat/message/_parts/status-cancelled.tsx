import { StatusBlock } from "@/components/ui-custom/feedback/status-block";
import {
  type StatusActionDescriptor,
  StatusActionList,
  type StatusActionPayload,
} from "./status-actions";

const CANCELLED_TITLE = "Cancelled";
const CANCELLED_BODY = "Response cancelled.";

const cancelledActions: StatusActionDescriptor[] = [
  {
    id: "continue",
    label: "Continue",
    intent: "primary",
    payload: { type: "continue" },
  },
  {
    id: "retry-another-model",
    label: "Retry with another model",
    intent: "secondary",
    payload: { type: "retry-model" },
  },
];

export type CancelledStatusPartProps = {
  onAction: (payload: StatusActionPayload) => void;
};

export function CancelledStatusPart({ onAction }: CancelledStatusPartProps) {
  return (
    <StatusBlock.Root className="w-full" kind="warning">
      <StatusBlock.Content>
        <StatusBlock.Title>{CANCELLED_TITLE}</StatusBlock.Title>
        <StatusBlock.Body>{CANCELLED_BODY}</StatusBlock.Body>
      </StatusBlock.Content>
      <StatusBlock.Actions>
        <StatusActionList actions={cancelledActions} onAction={onAction} />
      </StatusBlock.Actions>
    </StatusBlock.Root>
  );
}
