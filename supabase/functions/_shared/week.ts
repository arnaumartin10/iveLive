export function utcWeekStartDate(now = new Date()): string {
  const date = new Date(now);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}
