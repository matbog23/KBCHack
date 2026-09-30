import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/config/personas";
import { notaryPurpose, recogniseTransaction, SIGNAL_THRESHOLDS } from "@/engine/signals";
import {
  cardPayment,
  directDebit,
  SAMPLE,
  transferIn,
  transferOut,
} from "@/engine/testTransactions";
import { MCC, type PSD2Transaction } from "@/types/psd2";

function markers(transaction: PSD2Transaction): string[] {
  return recogniseTransaction(transaction).map((match) => match.marker);
}

describe("recogniseTransaction", () => {
  describe("an MCC describes the merchant, not the reason for the visit", () => {
    it("a GP paid by card (MCC 8011) is not a pregnancy signal", () => {
      expect(markers(SAMPLE.gpVisit)).toEqual([]);
    });

    it("a gynaecologist with the same MCC is recognised by name, with the MCC as support", () => {
      expect(recogniseTransaction(SAMPLE.gynaecologist)).toEqual([
        { marker: "gynaecology", sources: ["mcc", "counterparty"], matchedText: ["Gynaecologie"] },
      ]);
    });

    it("a gynaecologist paid by transfer, without any MCC, is recognised too", () => {
      const tx = transferOut("Dr. A. Janssens", "Consultatie gynaecologie + echografie", 65);
      expect(recogniseTransaction(tx)[0]).toMatchObject({
        marker: "gynaecology",
        sources: ["remittance"],
      });
    });

    it.each([["Gynécologue Dr. Dubois"], ["Vroedvrouwenpraktijk Lotus"], ["Verloskunde AZ Delta"]])(
      "recognises %s",
      (name) => {
        expect(markers(transferOut(name, "", 60))).toContain("gynaecology");
      },
    );

    it("ignores an MCC on anything other than a card payment", () => {
      const tx = transferOut("Some company", "", 540, { merchantCategoryCode: MCC.CHILD_CARE });
      expect(markers(tx)).toEqual([]);
    });
  });

  describe("hospital and maternity", () => {
    it("a hospital card payment (MCC 8062) is a hospital bill on the code alone", () => {
      expect(markers(cardPayment("Kassa 3", MCC.HOSPITALS, 90))).toEqual(["hospital"]);
    });

    it("a hospital invoice by transfer is recognised by the hospital's name", () => {
      expect(markers(SAMPLE.hospital)).toEqual(["hospital"]);
    });

    it("a maternity-ward invoice is both a hospital bill and a birth signal", () => {
      expect(markers(SAMPLE.maternity).sort()).toEqual(["hospital", "maternity"]);
    });
  });

  describe("birth grant", () => {
    it("the one-off Groeipakket start amount is recognised", () => {
      expect(markers(SAMPLE.birthGrant)).toEqual(["birth-grant"]);
    });

    it("the monthly child benefit is below the threshold and ignored", () => {
      const monthly = transferIn("FONS Groeipakket", "Groeipakket basisbedrag oktober", 180);
      expect(monthly.amount).toBeLessThan(SIGNAL_THRESHOLDS.birthGrantMinAmount);
      expect(markers(monthly)).toEqual([]);
    });

    it("the same words on an outgoing payment mean nothing", () => {
      expect(markers(transferOut("Someone", "kraamgeld terugbetaling", 1_350))).not.toContain(
        "birth-grant",
      );
    });
  });

  it("childcare is recognised from a direct debit's name, or from the card code", () => {
    expect(markers(SAMPLE.childcare)).toEqual(["childcare"]);
    expect(markers(cardPayment("Het Nestje", MCC.CHILD_CARE, 40))).toEqual(["childcare"]);
  });

  it("a notary needs the name: the generic legal-services code alone is not enough", () => {
    expect(markers(SAMPLE.notaryEstate)).toEqual(["notary"]);
    expect(markers(cardPayment("Advocatenkantoor Peeters", MCC.LEGAL_SERVICES, 250))).toEqual([]);
  });

  it("contractor payments count from the renovation threshold", () => {
    expect(markers(SAMPLE.contractor)).toEqual(["contractor"]);
    expect(markers(transferOut("Bouwbedrijf Maes BV", "Herstelling dakgoot", 300))).toEqual([]);
  });

  it("no seeded everyday payment carries a marker", () => {
    const seeded = [...PERSONAS.emma.transactions, ...PERSONAS.jan.transactions];
    expect(seeded.flatMap(recogniseTransaction)).toEqual([]);
  });

  it("everyday payments stay unrecognised", () => {
    expect(markers(cardPayment("Delhaize Leuven", MCC.GROCERY, 42))).toEqual([]);
    expect(markers(directDebit("Luminus", "Voorschotfactuur energie", 142))).toEqual([]);
  });
});

describe("notaryPurpose", () => {
  it("reads what the notary payment is about from its message", () => {
    expect(notaryPurpose(SAMPLE.notaryEstate)).toBe("estate");
    expect(notaryPurpose(SAMPLE.notaryHome)).toBe("purchase");
    expect(notaryPurpose(transferOut("Notaris Claes", "Ereloon", 250))).toBe("unknown");
  });
});
