import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render-route';
import { defaultPreferences } from '@/features/settings/schema';
import { usePreferencesStore } from '@/features/settings/store';
import { useThemeStore } from '@/stores/theme-store';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  useThemeStore.setState({ theme: 'system' });
  usePreferencesStore.setState({ preferences: defaultPreferences });
});

async function renderSettings(path = '/settings') {
  renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: 'Settings' });
}

describe('settings route', () => {
  it('renders inside the app shell with its own breadcrumb title', async () => {
    await renderSettings();

    // shadcn's BreadcrumbPage is role="link" + aria-current="page"; the sidebar item is a real link.
    expect(screen.getByRole('link', { name: 'Settings', current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings', current: false })).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  it('shows the four sections as a vertical menu, Basic first', async () => {
    await renderSettings();

    const menu = screen.getByRole('tablist', { name: 'Settings sections' });
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    expect(within(menu).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Basic',
      'Appearance',
      'Integration',
      'Members',
    ]);
    expect(screen.getByRole('tab', { name: 'Basic' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Home name')).toBeInTheDocument();
  });

  it('opens the tab named in the URL and falls back to Basic for unknown ones', async () => {
    await renderSettings('/settings?tab=integration');
    expect(screen.getByRole('tab', { name: 'Integration' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Panasonic Comfort Cloud')).toBeInTheDocument();
  });

  it('switches to dark theme and remembers the choice', async () => {
    const user = userEvent.setup();
    await renderSettings('/settings?tab=appearance');

    await user.click(within(screen.getByRole('radiogroup', { name: 'Theme' })).getByRole('radio', { name: 'Dark' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('nestly-theme')).toBe('dark');
  });

  it('rejects an empty home name and an out-of-range expiry window', async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.clear(screen.getByLabelText('Home name'));
    const days = screen.getByLabelText(/expiring soon/);
    await user.clear(days);
    await user.type(days, '45');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a name for your home')).toBeInTheDocument();
    expect(screen.getByText('At most 30 days')).toBeInTheDocument();
    expect(usePreferencesStore.getState().preferences).toEqual(defaultPreferences);
  });

  it('saves valid changes and confirms', async () => {
    const user = userEvent.setup();
    await renderSettings();

    const name = screen.getByLabelText('Home name');
    await user.clear(name);
    await user.type(name, '  Condo  ');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
    expect(usePreferencesStore.getState().preferences.homeName).toBe('Condo');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('cancel discards unsaved edits', async () => {
    const user = userEvent.setup();
    await renderSettings();

    const name = screen.getByLabelText('Home name');
    await user.type(name, ' extra');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(name).toHaveValue(defaultPreferences.homeName);
  });
});
