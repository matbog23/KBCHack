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
