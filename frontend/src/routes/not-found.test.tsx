import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render-route';

describe('unknown route', () => {
  it('shows the not-found page with a way back', async () => {
    renderRoute('/does-not-exist');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/');
  });
});
