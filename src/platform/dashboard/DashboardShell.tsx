/**
 * DashboardShell
 * --------------
 * Renders a responsive grid of widgets registered against an audience
 * key. Filters by permissions / roles automatically.
 */
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listWidgetsForAudience, type WidgetDescriptor } from "./WidgetRegistry";
import { useRoles } from "@/platform/permissions/usePermission";

interface Props {
  audience: string;
  title?: string;
  description?: string;
  className?: string;
  emptyState?: React.ReactNode;
}

const spanClass: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
};

export function DashboardShell({ audience, title, description, className, emptyState }: Props) {
  const { roles } = useRoles();
  const widgets = listWidgetsForAudience(audience).filter((w) => matchesRole(w, roles));

  return (
    <section className={cn("space-y-6", className)}>
      {(title || description) && (
        <header className="space-y-1">
          {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </header>
      )}
      {widgets.length === 0 ? (
        emptyState ?? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No widgets available yet.
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {widgets.map((w) => {
            const Cmp = w.component as React.ComponentType;
            return (
              <Card key={w.key} className={cn(spanClass[w.span ?? 2] ?? "md:col-span-2")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{w.title}</CardTitle>
                </CardHeader>
                <CardContent style={{ minHeight: w.minHeight ?? 120 }}>
                  <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                    <Cmp />
                  </Suspense>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function matchesRole(w: WidgetDescriptor, roles: string[]): boolean {
  if (!w.requiresRole) return true;
  const needed = Array.isArray(w.requiresRole) ? w.requiresRole : [w.requiresRole];
  return needed.some((r) => roles.includes(r));
}
