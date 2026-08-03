import { describe, expect, it } from "vitest";
import { inviteMemberSchema, parseMembershipRole } from "./organisation-validation";
import { isAdmin, slugifyOrgBase } from "./organisation-shared";

describe("organisation validation", () => {
  it("accepts a valid invite payload", () => {
    const parsed = inviteMemberSchema.safeParse({
      email: "person@example.com",
      role: "MEMBER",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const parsed = inviteMemberSchema.safeParse({
      email: "not-an-email",
      role: "ADMIN",
    });
    expect(parsed.success).toBe(false);
  });

  it("parses membership roles", () => {
    expect(parseMembershipRole("ADMIN")).toBe("ADMIN");
    expect(parseMembershipRole("MEMBER")).toBe("MEMBER");
    expect(parseMembershipRole("OWNER")).toBeNull();
  });

  it("recognises admin role", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MEMBER")).toBe(false);
  });

  it("slugifies organisation bases", () => {
    expect(slugifyOrgBase("Acme Corp!")).toBe("acme-corp");
    expect(slugifyOrgBase("   ")).toBe("org");
  });
});
