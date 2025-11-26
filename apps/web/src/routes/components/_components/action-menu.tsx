import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CopyIcon,
  EditIcon,
  MoreHorizontalIcon,
  PinIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ActionMenu,
  ActionMenuContent,
  type ActionMenuItem,
  ActionMenuTrigger,
} from "@/components/ui-custom/action-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/action-menu")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 font-semibold text-xl">Action Menu</h2>
        <p className="text-muted-foreground">
          A context menu component with long-press support for mobile.
          Right-click or long-press to open.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <BasicUsage />
        <WithIcons />
        <WithShortcuts />
        <DestructiveVariant />
        <DisabledItems />
        <LongPressDisabled />
        <OpenStateCallback />
        <EmptyItems />
        <MixedVariants />
      </div>
    </div>
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

function DemoFooter({ children }: { children: React.ReactNode }) {
  return (
    <CardFooter className="flex flex-col items-start gap-2">
      <h3 className="font-medium text-sm">Settings</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </CardFooter>
  );
}

function SettingWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row items-center gap-2">{children}</div>;
}

function DemoTrigger({
  label = "Right-click or long-press me",
  className,
  ref,
  ...props
}: { label?: string } & React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-24 w-full cursor-context-menu select-none items-center justify-center rounded-md border-2 border-muted-foreground/25 border-dashed bg-background px-4 text-center text-muted-foreground text-sm transition-colors hover:border-muted-foreground/50 hover:bg-muted/30",
        className
      )}
      ref={ref}
      {...props}
    >
      {label}
    </div>
  );
}

function BasicUsage() {
  const items: ActionMenuItem[] = [
    { id: "edit", label: "Edit", onSelect: () => toast("Edit selected") },
    { id: "copy", label: "Copy", onSelect: () => toast("Copy selected") },
    { id: "delete", label: "Delete", onSelect: () => toast("Delete selected") },
  ];

  return (
    <Card id="basic-usage">
      <CardHeader>
        <Link hash="#basic-usage" to=".">
          <CardTitle># Basic Usage</CardTitle>
        </Link>
        <CardDescription>Simple menu with text-only items</CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
    </Card>
  );
}

function WithIcons() {
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      onSelect: () => toast("Edit selected"),
      icon: EditIcon,
    },
    {
      id: "copy",
      label: "Copy",
      onSelect: () => toast("Copy selected"),
      icon: CopyIcon,
    },
    {
      id: "delete",
      label: "Delete",
      onSelect: () => toast("Delete selected"),
      icon: TrashIcon,
    },
  ];

  return (
    <Card id="with-icons">
      <CardHeader>
        <Link hash="#with-icons" to=".">
          <CardTitle># With Icons</CardTitle>
        </Link>
        <CardDescription>Items with leading icons</CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
    </Card>
  );
}

function WithShortcuts() {
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      icon: EditIcon,
      shortcut: "⌘E",
      onSelect: () => toast("Edit"),
    },
    {
      id: "copy",
      label: "Copy",
      icon: CopyIcon,
      shortcut: "⌘C",
      onSelect: () => toast("Copy"),
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      shortcut: "⌘⌫",
      onSelect: () => toast("Delete"),
    },
  ];

  return (
    <Card id="with-shortcuts">
      <CardHeader>
        <Link hash="#with-shortcuts" to=".">
          <CardTitle># With Shortcuts</CardTitle>
        </Link>
        <CardDescription>Items showing keyboard shortcuts</CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
    </Card>
  );
}

function DestructiveVariant() {
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      icon: EditIcon,
      onSelect: () => toast("Edit"),
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      variant: "destructive",
      onSelect: () => toast.error("Delete"),
    },
  ];

  return (
    <Card id="destructive-variant">
      <CardHeader>
        <Link hash="#destructive-variant" to=".">
          <CardTitle># Destructive Variant</CardTitle>
        </Link>
        <CardDescription>
          Items with destructive styling for dangerous actions
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
    </Card>
  );
}

function DisabledItems() {
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      icon: EditIcon,
      onSelect: () => toast("Edit"),
    },
    {
      id: "copy",
      label: "Copy (disabled)",
      icon: CopyIcon,
      disabled: true,
      onSelect: () => toast("Copy"),
    },
    {
      id: "share",
      label: "Share (disabled)",
      icon: ShareIcon,
      disabled: true,
      onSelect: () => toast("Share"),
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      variant: "destructive",
      onSelect: () => toast.error("Delete"),
    },
  ];

  return (
    <Card id="disabled-items">
      <CardHeader>
        <Link hash="#disabled-items" to=".">
          <CardTitle># Disabled Items</CardTitle>
        </Link>
        <CardDescription>
          Some items are disabled and not interactive
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
    </Card>
  );
}

function LongPressDisabled() {
  const [longPressEnabled, setLongPressEnabled] = useState(false);
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      icon: EditIcon,
      onSelect: () => toast("Edit"),
    },
    {
      id: "copy",
      label: "Copy",
      icon: CopyIcon,
      onSelect: () => toast("Copy"),
    },
  ];

  return (
    <Card id="long-press-disabled">
      <CardHeader>
        <Link hash="#long-press-disabled" to=".">
          <CardTitle># Long Press Disabled</CardTitle>
        </Link>
        <CardDescription>
          Only right-click works when long-press is disabled
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger longPressEnabled={longPressEnabled}>
            <DemoTrigger
              label={
                longPressEnabled
                  ? "Right-click or long-press"
                  : "Right-click only"
              }
            />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label
            className="text-muted-foreground text-sm"
            htmlFor="long-press-enabled"
          >
            Long Press Enabled
          </Label>
          <Switch
            checked={longPressEnabled}
            id="long-press-enabled"
            onCheckedChange={setLongPressEnabled}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function OpenStateCallback() {
  const [openCount, setOpenCount] = useState(0);
  const [closeCount, setCloseCount] = useState(0);
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      icon: EditIcon,
      onSelect: () => toast("Edit"),
    },
    {
      id: "copy",
      label: "Copy",
      icon: CopyIcon,
      onSelect: () => toast("Copy"),
    },
  ];

  return (
    <Card id="open-state-callback">
      <CardHeader>
        <Link hash="#open-state-callback" to=".">
          <CardTitle># Open State Callback</CardTitle>
        </Link>
        <CardDescription>
          Track menu open/close events via onOpenChange callback
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu
          items={items}
          onOpenChange={(open) => {
            if (open) setOpenCount((c) => c + 1);
            else setCloseCount((c) => c + 1);
          }}
        >
          <ActionMenuTrigger>
            <DemoTrigger />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm">
            Opened: <span className="font-medium">{openCount}</span> times |
            Closed: <span className="font-medium">{closeCount}</span> times
          </Label>
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function EmptyItems() {
  const [hasItems, setHasItems] = useState(false);
  const items: ActionMenuItem[] = hasItems
    ? [{ id: "action", label: "Action", onSelect: () => toast("Action") }]
    : [];

  return (
    <Card id="empty-items">
      <CardHeader>
        <Link hash="#empty-items" to=".">
          <CardTitle># Empty Items</CardTitle>
        </Link>
        <CardDescription>
          Graceful handling when no items are provided
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger
              label={
                hasItems
                  ? "Has menu items"
                  : "No menu items - just renders children"
              }
            />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="has-items">
            Has Items
          </Label>
          <Switch
            checked={hasItems}
            id="has-items"
            onCheckedChange={setHasItems}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function MixedVariants() {
  const items: ActionMenuItem[] = [
    {
      id: "pin",
      label: "Pin to top",
      icon: PinIcon,
      shortcut: "⌘P",
      onSelect: () => toast("Pinned"),
    },
    {
      id: "edit",
      label: "Edit",
      icon: EditIcon,
      shortcut: "⌘E",
      onSelect: () => toast("Edit"),
    },
    {
      id: "copy",
      label: "Copy",
      icon: CopyIcon,
      shortcut: "⌘C",
      onSelect: () => toast("Copied"),
    },
    {
      id: "share",
      label: "Share",
      icon: ShareIcon,
      onSelect: () => toast("Share dialog opened"),
    },
    {
      id: "more",
      label: "More options",
      icon: MoreHorizontalIcon,
      disabled: true,
      onSelect: () => toast("More"),
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      shortcut: "⌘⌫",
      variant: "destructive",
      onSelect: () => toast.error("Deleted"),
    },
  ];

  return (
    <Card id="mixed-variants">
      <CardHeader>
        <Link hash="#mixed-variants" to=".">
          <CardTitle># Mixed Variants</CardTitle>
        </Link>
        <CardDescription>
          Combining icons, shortcuts, disabled states, and variants
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <ActionMenu items={items}>
          <ActionMenuTrigger>
            <DemoTrigger label="Full-featured menu example" />
          </ActionMenuTrigger>
          <ActionMenuContent />
        </ActionMenu>
      </DemoContent>
    </Card>
  );
}
