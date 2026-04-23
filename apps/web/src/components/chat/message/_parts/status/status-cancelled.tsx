import { StatusBlock } from "@/components/ui-custom/feedback/status-block";

const CANCELLED_TITLE = "Cancelled";
const CANCELLED_BODY = "Response cancelled. Send a new message to continue.";

export function CancelledStatusPart() {
  return (
    <StatusBlock.Root className="w-full" kind="warning">
      <StatusBlock.Content>
        <StatusBlock.Title>{CANCELLED_TITLE}</StatusBlock.Title>
        <StatusBlock.Body>{CANCELLED_BODY}</StatusBlock.Body>
      </StatusBlock.Content>
    </StatusBlock.Root>
  );
}
