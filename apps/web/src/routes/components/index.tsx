import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/components/")({
  component: RouteComponent,
});

const components = [
  {
    name: "Sidebar",
    path: "/components/sidebar",
  },
  {
    name: "Button Group",
    path: "/components/button-group",
  },
] as const;

function RouteComponent() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-4xl">Components</h1>
        <p className="text-muted-foreground">Design system component library</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {components.map((component) => (
          <Link className="block" key={component.path} to={component.path}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{component.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  View component demo
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
