const euro = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });

const euroRounded = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Brussels",
});

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Brussels",
});

export function formatEuro(amount: number): string {
  return euro.format(amount);
}

export function formatEuroRounded(amount: number): string {
  return euroRounded.format(amount);
}

/** "+ € 1.350,00" / "− € 65,00", for transaction feeds. */
export function formatSignedEuro(amount: number): string {
  const sign = amount < 0 ? "−" : "+";
  return `${sign} ${euro.format(Math.abs(amount))}`;
}

export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

export function formatMonthYear(iso: string): string {
  return monthYear.format(new Date(iso));
}

/** Adds whole calendar months to an ISO timestamp, preserving the time of day. */
export function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

const kbcAmount = new Intl.NumberFormat("fr-BE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dayMonthNumeric = new Intl.DateTimeFormat("nl-BE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Brussels",
});

const monthLongNl = new Intl.DateTimeFormat("nl-BE", {
  month: "long",
  timeZone: "Europe/Brussels",
});

const DUTCH_MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mrt",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
] as const;

/** KBC Mobile style: "5 565,74" with a true minus sign for debits ("−7,00"). */
export function formatKbcAmount(amount: number): string {
  const formatted = kbcAmount.format(Math.abs(amount));
  return amount < 0 ? `−${formatted}` : formatted;
}

/** "30/09" */
export function formatDayMonthNumeric(iso: string): string {
  return dayMonthNumeric.format(new Date(iso));
}

/** "September" */
export function formatMonthNameNl(iso: string): string {
  const name = monthLongNl.format(new Date(iso));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "Sep", from a zero-based month index. */
export function dutchMonthAbbreviation(monthIndex: number): string {
  return DUTCH_MONTH_ABBREVIATIONS[((monthIndex % 12) + 12) % 12] ?? "";
}

/** Zero-based month index and year in Brussels time. */
export function brusselsMonth(iso: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "numeric",
    timeZone: "Europe/Brussels",
  }).formatToParts(new Date(iso));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value) - 1;
  return { year, month };
}
