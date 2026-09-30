/** Removes spaces and upper-cases, e.g. "be36 7340 …" → "BE3673401234…". */
export function compactIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/** Groups an IBAN in blocks of four for display, e.g. "BE36 7340 1234 5681". */
export function formatIban(iban: string): string {
  return compactIban(iban).replace(/(.{4})(?=.)/g, "$1 ");
}

/** ISO 13616 check: move the country code and check digits to the end, then mod 97 must be 1. */
function hasValidChecksum(compact: string): boolean {
  const rearranged = `${compact.slice(4)}${compact.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/**
 * Structural + checksum validation. Belgian IBANs additionally carry a mod-97 check on the
 * national account number (last two digits), which banks verify before accepting a transfer.
 */
export function isValidIban(iban: string): boolean {
  const compact = compactIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact)) return false;
  if (!hasValidChecksum(compact)) return false;
  if (compact.startsWith("BE")) {
    if (!/^BE\d{14}$/.test(compact)) return false;
    const national = Number(compact.slice(4, 14)) % 97 || 97;
    return national === Number(compact.slice(14));
  }
  return true;
}

/** Builds a valid, formatted Belgian IBAN from a 3-digit bank code and a 7-digit account number. */
export function belgianIban(bankCode: string, accountNumber: string): string {
  const first10 = `${bankCode.padStart(3, "0")}${accountNumber.padStart(7, "0")}`.slice(0, 10);
  const national = Number(first10) % 97 || 97;
  const bban = `${first10}${String(national).padStart(2, "0")}`;
  // "BE00" becomes 111400 (B = 11, E = 14) when moved to the end for the mod-97 calculation.
  const checkDigits = 98 - Number(BigInt(`${bban}111400`) % 97n);
  return formatIban(`BE${String(checkDigits).padStart(2, "0")}${bban}`);
}
