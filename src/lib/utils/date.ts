import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

const NEPAL_TZ = 'Asia/Kathmandu';

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: string = 'DD MMM YYYY'
): string {
  if (!date) return '-';
  return dayjs(date).tz(NEPAL_TZ).format(format);
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'DD MMM YYYY, hh:mm A');
}

/**
 * Get relative time (e.g. "2 hours ago")
 */
export function timeAgo(date: Date | string): string {
  return dayjs(date).fromNow();
}

/**
 * Get start of today in Nepal timezone
 */
export function todayStart(): Date {
  return dayjs().tz(NEPAL_TZ).startOf('day').toDate();
}

/**
 * Get end of today in Nepal timezone
 */
export function todayEnd(): Date {
  return dayjs().tz(NEPAL_TZ).endOf('day').toDate();
}

/**
 * Get start of current month
 */
export function monthStart(): Date {
  return dayjs().tz(NEPAL_TZ).startOf('month').toDate();
}

/**
 * Get end of current month
 */
export function monthEnd(): Date {
  return dayjs().tz(NEPAL_TZ).endOf('month').toDate();
}

/**
 * Get date N months ago
 */
export function monthsAgo(n: number): Date {
  return dayjs().tz(NEPAL_TZ).subtract(n, 'month').startOf('month').toDate();
}

/**
 * Get date N days ago
 */
export function daysAgo(n: number): Date {
  return dayjs().tz(NEPAL_TZ).subtract(n, 'day').startOf('day').toDate();
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  return dayjs(date).tz(NEPAL_TZ).isSame(dayjs().tz(NEPAL_TZ), 'day');
}

/**
 * Get Nepal current time
 */
export function nepalNow(): Date {
  return dayjs().tz(NEPAL_TZ).toDate();
}

export { dayjs };
