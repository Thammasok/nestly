import { screen, within } from '@testing-library/react';
import { renderRoute } from '@/test/render-route';

describe('dashboard route', () => {
  it('shows a card for each home domain', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    const main = within(screen.getByRole('main'));
    for (const name of ['Climate', 'Food', 'Electricity']) {
      expect(main.getByText(name)).toBeInTheDocument();
    }
  });
});
