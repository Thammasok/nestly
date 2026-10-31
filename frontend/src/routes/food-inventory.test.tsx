import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render-route';
import { STATIC_INVENTORY } from '@/features/food/static-inventory';

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

type User = ReturnType<typeof userEvent.setup>;

async function openInventory(path = '/food/inventory') {
  renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: 'Food inventory' });
  return screen.findByRole('table');
}

const foodNames = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('food inventory route', () => {
  it('lists every in-stock lot in FEFO order without calling the backend', async () => {
    const table = await openInventory();

    expect(within(table).getAllByRole('row')).toHaveLength(STATIC_INVENTORY.length + 1);
    // Expired milk (yesterday) first, then spinach (tomorrow), then the older egg batch.
    expect(foodNames(table).slice(0, 3)).toEqual([
      expect.stringContaining('Milk'),
      expect.stringContaining('Spinach'),
      expect.stringContaining('Eggs'),
    ]);
    expect(foodNames(table).at(-1)).toContain('Sea salt'); // no expiry → last
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags expiry status and the lot to use first', async () => {
    const table = await openInventory();
    const rows = within(table).getAllByRole('row');

    expect(within(rows[1]).getByText('Expired')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Expiring soon')).toBeInTheDocument();
    // Eggs: the batch expiring in 2 days is recommended, not the one bought yesterday.
    const eggRows = rows.filter((row) => row.textContent?.includes('Eggs'));
    expect(within(eggRows[0]).getByText('Use first')).toBeInTheDocument();
    expect(within(eggRows[1]).queryByText('Use first')).not.toBeInTheDocument();
    // Milk: the expired batch is skipped; the good one is recommended.
    const milkRows = rows.filter((row) => row.textContent?.includes('Milk'));
    expect(within(milkRows[1]).getByText('Use first')).toBeInTheDocument();
  });

  it('filters by location from the URL and by search', async () => {
    const user = userEvent.setup();
    const table = await openInventory('/food/inventory?location=freezer');

    expect(foodNames(table)).toEqual([expect.stringContaining('Chicken breast'), expect.stringContaining('Frozen peas')]);

    await user.click(screen.getByRole('radio', { name: 'All' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search inventory' }), 'dairy');
    expect(foodNames(table).every((name) => /Eggs|Milk|Greek yogurt/.test(name ?? ''))).toBe(true);

    await user.clear(screen.getByRole('searchbox', { name: 'Search inventory' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search inventory' }), 'durian');
    expect(within(table).getByText('No food matches "durian".')).toBeInTheDocument();
  });

  async function openAddDialog(user: User) {
    await user.click(screen.getByRole('button', { name: 'Add food' }));
    return within(await screen.findByRole('dialog', { name: 'Add food' }));
  }

  it('validates the add form before sending anything', async () => {
    const user = userEvent.setup();
    await openInventory();

    const dialog = await openAddDialog(user);
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await dialog.findByText('Enter a food name')).toBeInTheDocument();
    expect(dialog.getByText('Enter a quantity')).toBeInTheDocument();
    expect(dialog.getByText('Enter a unit')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds a lot, pre-filling the unit of a known food', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json({ ...STATIC_INVENTORY[0], id: 'lot_new', quantity: 12 }, 201));
    await openInventory();

    const dialog = await openAddDialog(user);
    await user.type(dialog.getByLabelText('Food'), 'Eggs');
    expect(dialog.getByLabelText('Unit')).toHaveValue('pcs');
    await user.type(dialog.getByLabelText('Quantity'), '12');
    await user.type(dialog.getByLabelText('Expires on'), '2026-12-01');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Added 12 pcs of Eggs to the fridge');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/inventory');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      foodName: 'Eggs',
      quantity: 12,
      unit: 'pcs',
      location: 'refrigerator',
      expirationDate: '2026-12-01',
    });
  });

  it('sends a null expiry when the date is left empty', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json({ ...STATIC_INVENTORY[0], expirationDate: null }, 201));
    await openInventory();

    const dialog = await openAddDialog(user);
    await user.type(dialog.getByLabelText('Food'), 'Honey');
    await user.type(dialog.getByLabelText('Quantity'), '1');
    await user.type(dialog.getByLabelText('Unit'), 'jar');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ foodName: 'Honey', expirationDate: null });
  });

  async function openAdjust(user: User, rowLabel: string, action: 'Use' | 'Discard') {
    await user.click(await screen.findByRole('button', { name: `Actions for ${rowLabel}` }));
    await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: action }));
    return within(await screen.findByRole('dialog'));
  }

  it('records a use and refuses more than the lot holds', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json({ ...STATIC_INVENTORY[0], quantity: 2 }));
    await openInventory();

    const dialog = await openAdjust(user, 'Eggs, 4 pcs', 'Use');
    await user.type(dialog.getByLabelText('Quantity (pcs)'), '5');
    await user.click(dialog.getByRole('button', { name: 'Record use' }));
    expect(await dialog.findByText('Only 4 left in this lot')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.clear(dialog.getByLabelText('Quantity (pcs)'));
    await user.type(dialog.getByLabelText('Quantity (pcs)'), '2');
    await user.click(dialog.getByRole('button', { name: 'Record use' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/inventory/lot_01/consume',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ quantity: 2 }) }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Used 2 pcs of Eggs');
  });

  it('discards the whole lot by default and shows backend errors in the dialog', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await openInventory();

    const dialog = await openAdjust(user, 'Milk, 1 L', 'Discard');
    expect(dialog.getByLabelText('Quantity (L)')).toHaveValue(1);
    await user.click(dialog.getByRole('button', { name: 'Discard' }));

    expect(await dialog.findByText(/Couldn't reach the server/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/inventory/lot_03/discard', expect.objectContaining({ method: 'POST' }));
  });

  it('is reachable from the sidebar', async () => {
    renderRoute('/');
    await screen.findByRole('heading', { name: 'Home' });
    expect(screen.getAllByRole('link', { name: /Food/ })[0]).toHaveAttribute('href', '/food/inventory');
  });
});
