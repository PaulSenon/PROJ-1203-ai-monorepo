import { Button } from "@/components/ui/button";

type StatusActionIntent = "primary" | "secondary";

export type StatusActionPayload =
  | { type: "continue" }
  | { type: "retry" }
  | { type: "retry-model"; modelId?: string };

export type StatusActionDescriptor = {
  id: string;
  label: string;
  intent: StatusActionIntent;
  payload: StatusActionPayload;
};

export type StatusActionListProps = {
  actions: StatusActionDescriptor[];
  onAction: (payload: StatusActionPayload) => void;
};

export function StatusActionList({ actions, onAction }: StatusActionListProps) {
  return (
    <>
      {actions.map((action) => (
        <Button
          className="h-7 px-2 text-xs"
          key={action.id}
          onClick={() => onAction(action.payload)}
          size="sm"
          type="button"
          variant={action.intent === "primary" ? "default" : "outline"}
        >
          {action.label}
        </Button>
      ))}
    </>
  );
}
