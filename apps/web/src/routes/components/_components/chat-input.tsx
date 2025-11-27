import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChatInput, ChatInputMobile } from "@/components/ui-custom/chat-input";

export const Route = createFileRoute("/components/_components/chat-input")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 font-semibold text-xl">Chat Input Component</h2>
        <p className="text-muted-foreground">
          A modular, animated chat input with multiple states for mobile UX.
          Supports minimized, open, fullscreen, and minimized-with-content
          states.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <BasicExample />
        <BasicExampleMobile />
      </div>
    </div>
  );
}

// ============================================================================
// Demo Helpers
// ============================================================================

function DemoFooter({ children }: { children: React.ReactNode }) {
  return (
    <CardFooter className="flex flex-col items-start gap-2">
      <h3 className="font-medium text-sm">Controls</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </CardFooter>
  );
}

function DemoContent({ children }: { children: React.ReactNode }) {
  return (
    <CardContent>
      <div className="relative h-[200px] justify-end overflow-y-scroll rounded-lg bg-muted/50">
        {/* Fake conversation content */}
        <div className="flex-1 p-4">
          <div className="space-y-2 text-muted-foreground text-sm">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Curabitur vel urna non diam condimentum molestie.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          </div>
        </div>
        {children}
      </div>
    </CardContent>
  );
}

function SettingWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row items-center gap-2">{children}</div>;
}

// ============================================================================
// Basic Example
// ============================================================================

function BasicExample() {
  return (
    <Card id="basic-example">
      <CardHeader>
        <Link hash="#basic-example" to=".">
          <CardTitle># Basic Example</CardTitle>
        </Link>
        <CardDescription>
          Default chat input with all features. Click to focus and see the
          transition.
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ChatInput className="sticky bottom-4 mx-auto max-w-lg" />
      </DemoContent>
    </Card>
  );
}

function BasicExampleMobile() {
  return (
    <Card id="basic-example">
      <CardHeader>
        <Link hash="#basic-example" to=".">
          <CardTitle># Basic Example</CardTitle>
        </Link>
        <CardDescription>
          Default chat input with all features. Click to focus and see the
          transition.
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ChatInputMobile className="sticky bottom-4 mx-auto max-w-lg" />
      </DemoContent>
    </Card>
  );
}
