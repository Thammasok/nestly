import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { queryClient } from '@/lib/query-client';
import { routeTree } from '@/routeTree.gen';

describe('dashboard route', () => {
  it('shows a card for each home domain', async () => {
    const router = createRouter({
      routeTree,
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    renderWithProviders(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    const main = within(screen.getByRole('main'));
    for (const name of ['Climate', 'Food', 'Electricity']) {
      expect(main.getByText(name)).toBeInTheDocument();
    }
  });
});
