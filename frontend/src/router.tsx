import { createBrowserRouter, type RouteObject } from 'react-router';

/** Static per-route metadata, read by the app shell via useMatches(). */
export interface RouteHandle {
  title: string;
}

// Pages load lazily so each route is its own chunk.
export const routes: RouteObject[] = [
  {
    lazy: async () => ({ Component: (await import('@/routes/app-layout')).AppLayout }),
    children: [
      {
        index: true,
        handle: { title: 'Dashboard' } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('@/routes/dashboard')).DashboardPage }),
      },
      {
        path: 'settings',
        handle: { title: 'Settings' } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('@/routes/settings')).SettingsPage }),
      },
    ],
  },
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('@/routes/login')).LoginPage }),
  },
  {
    path: '*',
    lazy: async () => ({ Component: (await import('@/routes/not-found')).NotFoundPage }),
  },
];

export const router = createBrowserRouter(routes);
