import { Outlet, useMatches } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import type { RouteHandle } from '@/router';

/** Pathless layout: every child route gets the sidebar shell; /login stays outside it. */
export function AppLayout() {
  // The deepest matched route that declares a title names the page.
  const title = useMatches()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .findLast(Boolean);

  return (
    <AppShell title={title ?? 'Nestly'}>
      <Outlet />
    </AppShell>
  );
}
