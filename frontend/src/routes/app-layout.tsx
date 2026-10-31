import { Outlet } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';

/** Pathless layout: every child route gets the sidebar shell; /login stays outside it. */
export function AppLayout() {
  return (
    <AppShell title="Dashboard">
      <Outlet />
    </AppShell>
  );
}
