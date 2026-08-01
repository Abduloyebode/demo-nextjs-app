import { describe, expect, it } from "vitest";
import { asStringArray } from "./document-json";

describe("asStringArray", () => {
  it("returns the array when it's already an array of strings", () => {
    expect(asStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("filters out non-string entries", () => {
    expect(asStringArray(["a", 1, null, "b", {}])).toEqual(["a", "b"]);
  });

  it("returns an empty array for null", () => {
    expect(asStringArray(null)).toEqual([]);
  });

  it("returns an empty array for a non-array value", () => {
    expect(asStringArray({ not: "an array" })).toEqual([]);
  });
});
