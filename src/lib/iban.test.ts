import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/config/personas";
import { DRAFT_PRESETS } from "@/config/presets";
import { belgianIban, formatIban, isValidIban } from "@/lib/iban";

describe("isValidIban", () => {
  it("accepts well-formed IBANs with correct checksums", () => {
    expect(isValidIban("BE71 0961 2345 6769")).toBe(true);
    expect(isValidIban("be71096123456769")).toBe(true);
    expect(isValidIban("NL91 ABNA 0417 1643 00")).toBe(true);
  });

  it("rejects a Belgian IBAN with a wrong check digit", () => {
    expect(isValidIban("BE68 7340 1234 5678")).toBe(false);
    expect(isValidIban("BE72 0961 2345 6769")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isValidIban("")).toBe(false);
    expect(isValidIban("NOT-AN-IBAN")).toBe(false);
  });
});

describe("belgianIban", () => {
  it("builds a valid, formatted IBAN", () => {
    const iban = belgianIban("735", "2000001");
    expect(isValidIban(iban)).toBe(true);
    expect(iban).toBe(formatIban(iban));
  });
});

describe("demo data", () => {
  it("every IBAN in the personas and presets passes the checksum", () => {
    const ibans = [
      ...Object.values(PERSONAS).flatMap(({ persona, transactions }) => [
        persona.checkingIban,
        persona.savingsIban,
        ...transactions.flatMap((tx) => [tx.creditorIban, tx.debtorIban]),
      ]),
      ...DRAFT_PRESETS.map((preset) => preset.draft.counterpartyIban),
    ].filter((iban): iban is string => Boolean(iban));
    expect(ibans.filter((iban) => !isValidIban(iban))).toEqual([]);
  });
});
