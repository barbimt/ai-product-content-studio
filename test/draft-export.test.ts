import { describe, expect, it } from "vitest";

import { draftDownloadFilename } from "@/lib/draft-export";

describe("draftDownloadFilename", () => {
  it("builds a slug filename from the product name", () => {
    expect(draftDownloadFilename("Northline Daypack 20L")).toBe(
      "northline-daypack-20l-description.txt",
    );
  });

  it("falls back when the product name is empty", () => {
    expect(draftDownloadFilename("   ")).toBe("product-description.txt");
  });
});
