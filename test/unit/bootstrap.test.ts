import { describe, expect, it } from "vitest";
import { BINARY_NAME, PACKAGE_NAME, VERSION } from "../../src/index.js";

describe("specty bootstrap", () => {
  it("exports package metadata", () => {
    expect(VERSION).toBe("0.1.0");
    expect(PACKAGE_NAME).toBe("@barcidev/specty");
    expect(BINARY_NAME).toBe("specty");
  });
});
