import { createFileRoute, Link } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import { useState } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
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
import { CollapsibleButtonGroup } from "@/components/ui-custom/button-group-collapsible";

export const Route = createFileRoute("/components/_components/button-group")({
  component: RouteComponent,
});

function DemoButton(
  props: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>
) {
  const [count, setCount] = useState(0);
  return (
    <Button {...props} onClick={() => setCount(count + 1)}>
      {count}
    </Button>
  );
}

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 font-semibold text-xl">Collapsible Button Group</h2>
        <p className="text-muted-foreground">
          A flexible button group component that supports collapsing buttons
          with smooth animations.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <NoCollapsibleContent />
        <WithCollapsibleContentAfter />
        <WithCollapsibleContentDefaultCollapsed />
        <WithCollapsibleContentBefore />
        <WithCollapsibleContentAround />

        <CollapsibleButtonGroup.Provider>
          <WithVisibleTriggerButton />
        </CollapsibleButtonGroup.Provider>

        <VerticalOrientation />

        <MultipleGroups />
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

function NoCollapsibleContent() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card id="no-collapsible-content">
      <CardHeader>
        <Link hash="#no-collapsible-content" to=".">
          <CardTitle>No Collapsible Content</CardTitle>
        </Link>
        <CardDescription>Same as ButtonGroup component</CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={collapsed}>
          <DemoButton variant="default">1</DemoButton>
          <DemoButton variant="default">2</DemoButton>
          <DemoButton variant="default">3</DemoButton>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />{" "}
          <span className="text-muted-foreground text-sm">
            no change expected
          </span>
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}
function WithCollapsibleContentAfter() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card id="with-collapsible-content-after">
      <CardHeader>
        <Link hash="#with-collapsible-content-after" to=".">
          <CardTitle># With Collapsible Content After</CardTitle>
        </Link>
        <CardDescription>Can collapse content after</CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={collapsed}>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function WithCollapsibleContentBefore() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card id="with-collapsible-content-before">
      <CardHeader>
        <Link hash="#with-collapsible-content-before" to=".">
          <CardTitle># With Collapsible Content Before</CardTitle>
        </Link>
        <CardDescription>Can collapse content before</CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={collapsed}>
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
          <DemoButton variant="default" />
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function WithCollapsibleContentAround() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card id="with-collapsible-content-around">
      <CardHeader>
        <Link hash="#with-collapsible-content-around" to=".">
          <CardTitle># With Collapsible Content Around</CardTitle>
        </Link>
        <CardDescription>Can collapse content from both sides</CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={collapsed}>
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
          <DemoButton variant="default" />
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function WithCollapsibleContentDefaultCollapsed() {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <Card id="with-collapsible-content-default-collapsed">
      <CardHeader>
        <Link hash="#with-collapsible-content-default-collapsed" to=".">
          <CardTitle># With Collapsible Content (default collapsed)</CardTitle>
        </Link>
        <CardDescription>Starts in collapsed state by default</CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={collapsed}>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function WithVisibleTriggerButton() {
  const { collapsed, setCollapsed } = CollapsibleButtonGroup.useState();

  return (
    <Card id="with-trigger-button">
      <CardHeader>
        <Link hash="#with-trigger-button" to=".">
          <CardTitle># With Trigger Button</CardTitle>
        </Link>
        <CardDescription>
          Manual control with a dedicated toggle button
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={collapsed}>
          <CollapsibleButtonGroup.TriggerButton>
            Toggle
          </CollapsibleButtonGroup.TriggerButton>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function VerticalOrientation() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card id="vertical-orientation">
      <CardHeader>
        <Link hash="#vertical-orientation" to=".">
          <CardTitle># Vertical Orientation</CardTitle>
        </Link>
        <CardDescription>
          Stack buttons vertically instead of horizontally
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup
          className="min-h-[180px] gap-2"
          collapsed={collapsed}
          orientation="vertical"
        >
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="collapsed">
            Collapsed
          </Label>
          <Switch
            checked={collapsed}
            id="collapsed"
            onCheckedChange={(checked) => setCollapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}

function MultipleGroups() {
  const [group1Collapsed, setGroup1Collapsed] = useState(false);
  const [group2Collapsed, setGroup2Collapsed] = useState(true);
  return (
    <Card id="multiple-groups">
      <CardHeader>
        <Link hash="#multiple-groups" to=".">
          <CardTitle># Multiple Groups</CardTitle>
        </Link>
        <CardDescription>
          Example with multiple independent button groups
        </CardDescription>
      </CardHeader>
      <DemoContent>
        <CollapsibleButtonGroup className="gap-2" collapsed={group1Collapsed}>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
        <CollapsibleButtonGroup className="gap-2" collapsed={group2Collapsed}>
          <DemoButton variant="default" />
          <CollapsibleButtonGroup.CollapsibleContent>
            <DemoButton variant="secondary" />
            <DemoButton variant="secondary" />
          </CollapsibleButtonGroup.CollapsibleContent>
        </CollapsibleButtonGroup>
      </DemoContent>
      <DemoFooter>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="group1">
            Group 1
          </Label>
          <Switch
            checked={group1Collapsed}
            id="group1"
            onCheckedChange={(checked) => setGroup1Collapsed(checked)}
          />
        </SettingWrapper>
        <SettingWrapper>
          <Label className="text-muted-foreground text-sm" htmlFor="group2">
            Group 2
          </Label>
          <Switch
            checked={group2Collapsed}
            id="group2"
            onCheckedChange={(checked) => setGroup2Collapsed(checked)}
          />
        </SettingWrapper>
      </DemoFooter>
    </Card>
  );
}
