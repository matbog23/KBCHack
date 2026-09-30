import { describe, expect, it } from "vitest";
import {
  buildBerlinGroupTransaction,
  normalizeAmount,
  parseBerlinGroupPayload,
  type TransactionDraft,
  validateDraft,
} from "@/psd2/berlinGroup";

const holder = { name: "Emma Claes", iban: "BE36 7340 1234 5681" };
const context = { accountHolder: holder, receivedAt: "2026-09-30T07:01:00.000Z" };

const gynecology: TransactionDraft = {
  paymentType: "card",
  amount: "65,00",
  counterpartyName: "Dr. Peeters Gynaecologie",
  counterpartyIban: "",
  merchantCategoryCode: "8011",
  remittanceInformation: "",
};

const kraamgeld: TransactionDraft = {
  paymentType: "transfer-in",
  amount: "1.350,00",
  counterpartyName: "FONS Groeipakket",
  counterpartyIban: "BE91 0017 7654 3276",
  merchantCategoryCode: "",
  remittanceInformation: "Groeipakket startbedrag geboorte",
};

const childcare: TransactionDraft = {
  paymentType: "direct-debit",
  amount: "540,00",
  counterpartyName: "Kinderdagverblijf Het Nestje",
  counterpartyIban: "BE88 0635 5443 3241",
  merchantCategoryCode: "",
  remittanceInformation: "Opvang oktober",
};

function build(draft: TransactionDraft) {
  return buildBerlinGroupTransaction(draft, {
    transactionId: "sim-emma-0001",
    bookingDate: "2026-09-30",
    accountHolder: holder,
  });
}

describe("normalizeAmount", () => {
  it.each([
    ["65", "65.00"],
    ["65,5", "65.50"],
    ["1.350,00", "1350.00"],
    ["1350.00", "1350.00"],
    ["€ 42,17", "42.17"],
    ["2.222,22", "2222.22"],
    ["1\u00A0350,00", "1350.00"],
  ])("reads %s as %s", (input, expected) => {
    expect(normalizeAmount(input)).toBe(expected);
  });

  it.each(["", "0", "-5", "abc", "1,234,5", "12.345"])("rejects %s", (input) => {
    expect(normalizeAmount(input)).toBeNull();
  });
});

describe("validateDraft", () => {
  it("accepts complete drafts of every payment type", () => {
    expect(validateDraft(gynecology)).toEqual({});
    expect(validateDraft(kraamgeld)).toEqual({});
    expect(validateDraft(childcare)).toEqual({});
  });

  it("requires an MCC on card payments", () => {
    expect(validateDraft({ ...gynecology, merchantCategoryCode: "" })).toHaveProperty(
      "merchantCategoryCode",
    );
  });

  it("requires a valid counterparty IBAN on SEPA payments", () => {
    expect(validateDraft({ ...childcare, counterpartyIban: "" })).toHaveProperty(
      "counterpartyIban",
    );
    // Right shape, wrong checksum.
    expect(validateDraft({ ...childcare, counterpartyIban: "BE68 7340 1234 5678" })).toHaveProperty(
      "counterpartyIban",
    );
  });

  it("flags every invalid field", () => {
    const errors = validateDraft({
      paymentType: "transfer-out",
      amount: "0",
      counterpartyName: " ",
      counterpartyIban: "NOT-AN-IBAN",
      merchantCategoryCode: "",
      remittanceInformation: "x".repeat(141),
    });
    expect(Object.keys(errors).sort()).toEqual([
      "amount",
      "counterpartyIban",
      "counterpartyName",
      "remittanceInformation",
    ]);
  });
});

describe("buildBerlinGroupTransaction", () => {
  it("builds a card payment: POS code, generated statement line, MCC in the KBC extension", () => {
    expect(build(gynecology)).toEqual({
      transactionId: "sim-emma-0001",
      entryReference: "SIM-EMMA-0001",
      bookingDate: "2026-09-30",
      valueDate: "2026-09-30",
      transactionAmount: { currency: "EUR", amount: "-65.00" },
      creditorName: "Dr. Peeters Gynaecologie",
      remittanceInformationUnstructured: "Bancontact-betaling 30/09 Dr. Peeters Gynaecologie",
      bankTransactionCode: "PMNT-CCRD-POSD",
      kbcCardDetails: { merchantCategoryCode: "8011" },
    });
  });

  it("never puts an MCC on the standard part of the payload", () => {
    for (const draft of [gynecology, kraamgeld, childcare]) {
      expect(build(draft)).not.toHaveProperty("merchantCategoryCode");
    }
  });

  it("books an incoming transfer to the account holder, with the payer as debtor", () => {
    expect(build(kraamgeld)).toMatchObject({
      transactionAmount: { currency: "EUR", amount: "1350.00" },
      creditorName: "Emma Claes",
      creditorAccount: { iban: "BE36734012345681" },
      debtorName: "FONS Groeipakket",
      debtorAccount: { iban: "BE91001776543276" },
      bankTransactionCode: "PMNT-RCDT-ESCT",
    });
    expect(build(kraamgeld)).not.toHaveProperty("kbcCardDetails");
  });

  it("marks a direct debit with the SEPA direct-debit code and keeps its message", () => {
    expect(build(childcare)).toMatchObject({
      creditorName: "Kinderdagverblijf Het Nestje",
      creditorAccount: { iban: "BE88063554433241" },
      remittanceInformationUnstructured: "Opvang oktober",
      bankTransactionCode: "PMNT-RDDT-ESDD",
    });
  });
});

describe("parseBerlinGroupPayload", () => {
  it("round-trips a card payment into the engine's model, MCC included", () => {
    const wire = JSON.parse(JSON.stringify(build(gynecology)));
    expect(parseBerlinGroupPayload(wire, context)).toEqual({
      ok: true,
      transactions: [
        expect.objectContaining({
          transactionId: "sim-emma-0001",
          bookingDate: "2026-09-30T07:01:00.000Z",
          amount: -65,
          creditDebitIndicator: "DBIT",
          channel: "card",
          bankTransactionCode: "PMNT-CCRD-POSD",
          creditorName: "Dr. Peeters Gynaecologie",
          merchantCategoryCode: "8011",
          isSimulated: true,
        }),
      ],
    });
  });

  it("derives the channel from the bank transaction code", () => {
    const channelOf = (draft: TransactionDraft) => {
      const result = parseBerlinGroupPayload(build(draft), context);
      return result.ok ? result.transactions[0]?.channel : undefined;
    };
    expect(channelOf(childcare)).toBe("direct-debit");
    expect(channelOf(kraamgeld)).toBe("transfer");
  });

  it("formats IBANs and fills in the account holder on credits", () => {
    const result = parseBerlinGroupPayload(build(kraamgeld), context);
    expect(result.ok && result.transactions[0]).toMatchObject({
      amount: 1350,
      creditDebitIndicator: "CRDT",
      creditorName: "Emma Claes",
      creditorIban: "BE36 7340 1234 5681",
      debtorName: "FONS Groeipakket",
      debtorIban: "BE91 0017 7654 3276",
      merchantCategoryCode: undefined,
    });
  });

  it("accepts a plain Berlin Group transaction from another bank, without any KBC extension", () => {
    const result = parseBerlinGroupPayload(
      {
        transactionId: "ext-1",
        bookingDate: "2026-09-29",
        transactionAmount: { currency: "EUR", amount: "-420.00" },
        creditorName: "AZ Sint-Jan Brugge",
        creditorAccount: { iban: "BE60473021234570" },
        remittanceInformationUnstructured: "Factuur kraamafdeling",
      },
      context,
    );
    expect(result.ok && result.transactions[0]).toMatchObject({ channel: "transfer" });
  });

  it("accepts a full Berlin Group transactions response", () => {
    const response = {
      account: { iban: "BE36734012345681" },
      transactions: { booked: [build(gynecology), { ...build(kraamgeld), transactionId: "b" }] },
    };
    const result = parseBerlinGroupPayload(response, context);
    expect(result.ok && result.transactions.map((tx) => tx.transactionId)).toEqual([
      "sim-emma-0001",
      "b",
    ]);
  });

  it("rejects an MCC placed where no Berlin Group payload carries one", () => {
    const { kbcCardDetails: _, ...rest } = build(gynecology);
    const result = parseBerlinGroupPayload({ ...rest, merchantCategoryCode: "8011" }, context);
    expect(!result.ok && result.errors[0]).toMatch(/not a field of a Berlin Group account/);
  });

  it("rejects malformed payloads with readable reasons", () => {
    const result = parseBerlinGroupPayload(
      {
        transactionId: "x",
        bookingDate: "30/09/2026",
        transactionAmount: { currency: "USD", amount: "65" },
        creditorAccount: { iban: "BE68734012345678" },
        kbcCardDetails: { merchantCategoryCode: "80110" },
      },
      context,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual([
      'transaction: "bookingDate" must be an ISO date (YYYY-MM-DD).',
      "transaction: only EUR transactions are supported.",
      'transaction: "creditorAccount.iban" is not a valid IBAN.',
      'transaction: "kbcCardDetails.merchantCategoryCode" must be four digits.',
      'transaction: a credit needs a "debtorName".',
    ]);
  });

  it("rejects the whole response when one booked transaction is invalid", () => {
    const response = { transactions: { booked: [build(gynecology), { transactionId: "bad" }] } };
    const result = parseBerlinGroupPayload(response, context);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(/^booked\[1\]:/);
  });

  it("rejects non-objects", () => {
    expect(parseBerlinGroupPayload("hello", context)).toEqual({
      ok: false,
      errors: ["transaction: expected a transaction object."],
    });
  });
});
