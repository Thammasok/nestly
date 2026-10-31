import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render-route';
import { STATIC_MEMBERS } from '@/features/members/static-members';

const ada = {
  id: 'm1',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-10-01T00:00:00.000Z',
  lastSignInAt: null,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openMembers() {
  renderRoute('/settings?tab=members');
  await screen.findByRole('heading', { level: 1, name: 'Settings' });
}

type User = ReturnType<typeof userEvent.setup>;

async function openDialog(user: User) {
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  return within(await screen.findByRole('dialog', { name: 'Create new account' }));
}

async function submitAccount(user: User, email = 'bob@example.com') {
  const dialog = await openDialog(user);
  await user.type(dialog.getByLabelText('Name'), 'Bob');
  await user.type(dialog.getByLabelText('Email'), email);
  await user.type(dialog.getByLabelText('Temporary password'), 's3cret-pass');
  await user.click(dialog.getByRole('button', { name: 'Create account' }));
  return dialog;
}

describe('settings › members', () => {
  it('lists the static members in a table without calling the backend', async () => {
    await openMembers();

    const table = await screen.findByRole('table');
    // header row + one row per member
    expect(within(table).getAllByRole('row')).toHaveLength(STATIC_MEMBERS.length + 1);
    for (const member of STATIC_MEMBERS) {
      expect(within(table).getByText(member.email)).toBeInTheDocument();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches by name or email', async () => {
    const user = userEvent.setup();
    await openMembers();
    const table = await screen.findByRole('table');

    await user.type(screen.getByRole('searchbox', { name: 'Search members' }), 'ploy@');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Ploy Wongsa')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search members' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search members' }), 'nobody');
    expect(within(table).getByText('No members match "nobody".')).toBeInTheDocument();
  });

  it('sorts by name, toggling direction from the header', async () => {
    const user = userEvent.setup();
    await openMembers();
    const table = await screen.findByRole('table');
    const firstName = () => within(within(table).getAllByRole('row')[1]).getAllByRole('cell')[0].textContent;

    expect(firstName()).toContain('Charan Chai');
    await user.click(within(table).getByRole('button', { name: 'Name' }));
    expect(firstName()).toContain('Somchai Dee');
    expect(within(table).getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('validates in the dialog before sending anything', async () => {
    const user = userEvent.setup();
    await openMembers();

    const dialog = await openDialog(user);
    await user.type(dialog.getByLabelText('Email'), 'not-an-email');
    await user.type(dialog.getByLabelText('Temporary password'), 'short');
    await user.click(dialog.getByRole('button', { name: 'Create account' }));

    expect(await dialog.findByText('Enter a name')).toBeInTheDocument();
    expect(dialog.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(dialog.getByText('Use at least 8 characters')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates an account through the API and confirms', async () => {
    const user = userEvent.setup();
    const bob = { ...ada, id: 'm2', name: 'Bob', email: 'bob@example.com', role: 'member' };
    fetchMock.mockResolvedValueOnce(json(bob, 201));
    await openMembers();

    await submitAccount(user);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Account created for bob@example.com');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/members');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Bob',
      email: 'bob@example.com',
      password: 's3cret-pass',
      role: 'member',
    });
  });

  it('shows a form error in the dialog when the backend is unreachable', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await openMembers();

    const dialog = await submitAccount(user);

    expect(await dialog.findByText(/Couldn't reach the server/)).toBeInTheDocument();
  });

  it('flags a duplicate email on the email field', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json({ message: 'Email already registered' }, 409));
    await openMembers();

    const dialog = await submitAccount(user, 'ada@example.com');

    expect(await dialog.findByText('An account with this email already exists')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // stays open so it can be corrected
  });

  it('cancel closes the dialog and the next open starts empty', async () => {
    const user = userEvent.setup();
    await openMembers();

    let dialog = await openDialog(user);
    await user.type(dialog.getByLabelText('Name'), 'Half typed');
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await openDialog(user);
    expect(dialog.getByLabelText('Name')).toHaveValue('');
  });
});

describe('settings › members › row actions', () => {
  async function openActions(user: User, name: string) {
    await openMembers();
    await user.click(await screen.findByRole('button', { name: `Actions for ${name}` }));
    return within(await screen.findByRole('menu'));
  }

  it('Info shows the member details', async () => {
    const user = userEvent.setup();
    const menu = await openActions(user, 'Somchai Dee');

    await user.click(menu.getByRole('menuitem', { name: 'Info' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Somchai Dee' }));
    expect(dialog.getByText('somchai@nestly.home')).toBeInTheDocument();
    expect(dialog.getByText('Never')).toBeInTheDocument(); // no sign-in yet
  });

  it('History lists recent activity', async () => {
    const user = userEvent.setup();
    const menu = await openActions(user, 'Charan Chai');

    await user.click(menu.getByRole('menuitem', { name: 'History' }));

    const sheet = within(await screen.findByRole('dialog', { name: 'History' }));
    expect(await sheet.findByText('Changed Living Room AC to 26°C')).toBeInTheDocument();
    expect(sheet.getAllByRole('listitem')).toHaveLength(3);
  });

  async function openResetPassword(user: User) {
    const menu = await openActions(user, 'Ploy Wongsa');
    await user.click(menu.getByRole('menuitem', { name: 'Reset password' }));
    return within(await screen.findByRole('dialog', { name: 'Reset password' }));
  }

  it('Reset password rejects a short password before sending', async () => {
    const user = userEvent.setup();
    const dialog = await openResetPassword(user);

    expect(dialog.queryByLabelText(/confirm/i)).not.toBeInTheDocument();
    await user.type(dialog.getByLabelText('New password'), 'short');
    await user.click(dialog.getByRole('button', { name: 'Set new password' }));

    expect(await dialog.findByText('Use at least 8 characters')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Generate fills a strong password that Copy puts on the clipboard', async () => {
    const user = userEvent.setup(); // user-event installs a clipboard stub we can read back
    const dialog = await openResetPassword(user);
    const field = dialog.getByLabelText('New password');

    expect(dialog.getByRole('button', { name: 'Copy password' })).toBeDisabled();
    await user.click(dialog.getByRole('button', { name: 'Generate password' }));
    const generated = (field as HTMLInputElement).value;
    expect(generated).toHaveLength(16);

    await user.click(dialog.getByRole('button', { name: 'Copy password' }));
    expect(await navigator.clipboard.readText()).toBe(generated);
    expect(dialog.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(dialog.getByText('Copied to clipboard.')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Generate password' }));
    expect(field).not.toHaveValue(generated);
    expect(dialog.getByRole('button', { name: 'Copy password' })).toBeInTheDocument(); // copied state cleared
  });

  it('Reset password sends the admin-chosen password and confirms', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    const dialog = await openResetPassword(user);

    await user.type(dialog.getByLabelText('New password'), 'n3w-passw0rd');
    await user.click(dialog.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/members/mem_03/reset-password');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ password: 'n3w-passw0rd' });
    expect(screen.getByRole('status')).toHaveTextContent('New password set for ploy@nestly.home');
  });

  it('Deactivate keeps the confirmation open and shows the error when the backend fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const menu = await openActions(user, 'Nok Somsri');

    await user.click(menu.getByRole('menuitem', { name: 'Deactivate' }));
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Deactivate Nok Somsri?' }));
    await user.click(dialog.getByRole('button', { name: 'Deactivate' }));

    expect(await dialog.findByText(/Couldn't reach the server/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/members/mem_02/deactivate', expect.objectContaining({ method: 'POST' }));
  });

  it('disables reset and deactivate for an already deactivated member', async () => {
    const user = userEvent.setup();
    const menu = await openActions(user, 'Mali Jaidee');

    expect(menu.getByRole('menuitem', { name: 'Reset password' })).toHaveAttribute('aria-disabled', 'true');
    expect(menu.getByRole('menuitem', { name: 'Deactivated' })).toHaveAttribute('aria-disabled', 'true');
    expect(menu.getByRole('menuitem', { name: 'Info' })).not.toHaveAttribute('aria-disabled');
  });
});
