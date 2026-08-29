const DEFAULT_REPORTING_TIME_ZONE = "UTC";

export function reportingTimeZone(value = process.env.AEO_REPORTING_TIMEZONE): string {
  const timeZone = value?.trim() || DEFAULT_REPORTING_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return DEFAULT_REPORTING_TIME_ZONE;
  }
}

/** Return the calendar date in the configured reporting zone, not the runtime zone. */
export function reportingDateKey(date: Date, timeZone = reportingTimeZone()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: reportingTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
