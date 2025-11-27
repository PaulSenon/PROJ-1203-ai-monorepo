import { createFileRoute } from "@tanstack/react-router";
import {
  PromptInput,
  PromptInputBody,
  PromptInputProvider,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { CardContent, CardFooter } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroupUnfuckedTextarea,
  UnfuckedTextarea,
} from "@/components/ui-custom/primitives/unfucked-textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/textarea")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 font-semibold text-xl">
          Unfucked textarea because shadcn is shit
        </h2>
        <p className="text-muted-foreground">
          A textarea tha work as intended.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <AutoGrowTextarea />
        <InputGroupAutoGrowTextarea />
        <PromptInputAutoGrowTextarea />
      </div>
    </div>
  );
}

function DemoFooter({ children }: { children: React.ReactNode }) {
  return (
    <CardFooter className="flex flex-col items-start gap-2">
      <h3 className="font-medium text-sm">Settings</h3>
      <div className="flex flex-col items-center gap-2">{children}</div>
    </CardFooter>
  );
}

function DemoContent({ children }: { children: React.ReactNode }) {
  return (
    <CardContent>
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-muted/50 p-6">
        {children}
      </div>
    </CardContent>
  );
}

function SettingWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row items-center gap-2">{children}</div>;
}

function AutoGrowTextarea() {
  return (
    <DemoContent>
      <form className="w-full">
        <FieldGroup>
          <Field>
            <FieldLabel>Textarea</FieldLabel>
            <FieldContent>
              <UnfuckedTextarea
                className="max-h-48 min-h-8"
                resizable={false}
                rows={1}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </form>
    </DemoContent>
  );
}
function InputGroupAutoGrowTextarea() {
  return (
    <DemoContent>
      <form className="w-full">
        <FieldGroup>
          <Field>
            <FieldLabel>Textarea</FieldLabel>
            <FieldContent>
              <InputGroupUnfuckedTextarea
                className="max-h-48 min-h-8 border"
                resizable={false}
                rows={1}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </form>
    </DemoContent>
  );
}
function PromptInputAutoGrowTextarea() {
  return (
    <DemoContent>
      <form className="w-full">
        <FieldGroup>
          <Field>
            <FieldLabel>Textarea</FieldLabel>
            <FieldContent>
              <PromptInput
                inputClassName={cn(
                  "h-full",
                  "rounded-xl bg-background dark:border-initial dark:bg-initial",
                  "bg-background/80 backdrop-blur-md",
                  "border-border/50",
                  "shadow-sm",
                  "focus-within:border-border focus-within:bg-background/90 focus-within:shadow-lg"
                )}
                onSubmit={() => console.log("submitted")}
              >
                <PromptInputProvider>
                  <PromptInputBody>
                    <PromptInputTextarea
                      className="max-h-48 min-h-8"
                      rows={1}
                    />
                  </PromptInputBody>
                </PromptInputProvider>
              </PromptInput>
            </FieldContent>
          </Field>
        </FieldGroup>
      </form>
    </DemoContent>
  );
}
