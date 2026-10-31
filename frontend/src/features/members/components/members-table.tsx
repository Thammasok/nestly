import { useMemo, useState } from 'react';
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type SortingState,
  type ColumnVisibilityState,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Member } from '@/features/members/api';
import { RoleBadge, StatusBadge } from '@/features/members/components/member-badges';
import { MemberRowActions } from '@/features/members/components/member-row-actions';
import { useMembers } from '@/features/members/queries';
import { formatDate } from '@/lib/format';

// v9 tables are tree-shaken: register only the features and row models we use.
const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, datetime: sortFn_datetime },
  filterFns: { includesString: filterFn_includesString },
});

const helper = createColumnHelper<typeof features, Member>();
const SEARCHABLE_COLUMNS = new Set(['name', 'email']);
const NO_MEMBERS: Member[] = []; // stable fallback so row models aren't rebuilt every render
// Email is rendered under the name, but stays a (hidden) column so the search can match it.
const COLUMN_VISIBILITY: ColumnVisibilityState = { email: false };

function SortableHeader({ label, sorted, onToggle }: { label: string; sorted: false | 'asc' | 'desc'; onToggle: () => void }) {
  const Icon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowUpDownIcon;
  return (
    <Button variant="ghost" size="sm" className="-ml-2.5" onClick={onToggle}>
      {label}
      <Icon aria-hidden className={sorted ? undefined : 'text-muted-foreground'} />
    </Button>
  );
}

export function MembersTable({ onNotice }: { onNotice: (message: string) => void }) {
  const { data, isPending, isError, error, refetch, isFetching } = useMembers();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: ({ column }) => (
            <SortableHeader label="Name" sorted={column.getIsSorted()} onToggle={() => column.toggleSorting()} />
          ),
          sortFn: 'text',
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{row.original.name}</span>
              <span className="truncate text-muted-foreground">{row.original.email}</span>
            </div>
          ),
        }),
        helper.accessor('email', { header: 'Email' }),
        helper.accessor('role', {
          header: ({ column }) => (
            <SortableHeader label="Role" sorted={column.getIsSorted()} onToggle={() => column.toggleSorting()} />
          ),
          sortFn: 'text',
          cell: ({ getValue }) => <RoleBadge role={getValue()} />,
        }),
        helper.accessor('status', {
          header: ({ column }) => (
            <SortableHeader label="Status" sorted={column.getIsSorted()} onToggle={() => column.toggleSorting()} />
          ),
          sortFn: 'text',
          cell: ({ getValue }) => <StatusBadge status={getValue()} />,
        }),
        helper.accessor('createdAt', {
          header: ({ column }) => (
            <SortableHeader label="Created" sorted={column.getIsSorted()} onToggle={() => column.toggleSorting()} />
          ),
          sortFn: 'datetime',
          cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span>,
        }),
        helper.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <MemberRowActions member={row.original} onNotice={onNotice} />
            </div>
          ),
        }),
      ]),
    [onNotice],
  );

  const table = useTable({
    features,
    columns,
    data: data ?? NO_MEMBERS,
    state: { sorting, globalFilter, columnVisibility: COLUMN_VISIBILITY },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => SEARCHABLE_COLUMNS.has(column.id),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading members">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Search name or email"
          aria-label="Search members"
          className="pl-9"
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className={header.column.id === 'actions' ? 'w-12' : undefined}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center text-muted-foreground">
                  {globalFilter ? `No members match "${globalFilter}".` : 'No members yet.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.status === 'deactivated' ? 'text-muted-foreground' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
