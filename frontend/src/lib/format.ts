const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const relativeDays = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** YYYY-MM-DD as a local calendar day; `new Date('2026-10-31')` would be UTC midnight and can show the day before. */
export const formatCalendarDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
};
export const formatNumber = (value: number) => numberFormat.format(value);
/** "today", "tomorrow", "in 5 days", "2 days ago". */
export const formatRelativeDays = (days: number) => relativeDays.format(days, 'day');
