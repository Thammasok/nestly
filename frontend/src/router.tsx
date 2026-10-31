import { createBrowserRouter, type RouteObject } from 'react-router';

// Pages load lazily so each route is its own chunk.
export const routes: RouteObject[] = [
  {
    lazy: async () => ({ Component: (await import('@/routes/app-layout')).AppLayout }),
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/routes/dashboard')).DashboardPage }),
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
