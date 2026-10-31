import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <AppShell title="Dashboard">
      <Outlet />
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Not found">
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </AppShell>
  ),
});
