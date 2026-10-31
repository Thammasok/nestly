import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render-route';

describe('login route', () => {
  it('renders the login form without the app sidebar', async () => {
    renderRoute('/login');

    expect(await screen.findByRole('heading', { name: 'Welcome to Nestly' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });
});
