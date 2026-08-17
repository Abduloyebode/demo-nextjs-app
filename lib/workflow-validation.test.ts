import { describe, expect, it } from "vitest";
import { workflowSchema } from "./workflow-validation";

describe("workflowSchema", () => {
  it("accepts valid input", () => {
    const result = workflowSchema.safeParse({
      name: "Ship onboarding redesign",
      description: "A short description",
      status: "IN_PROGRESS",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty description", () => {
    const result = workflowSchema.safeParse({
      name: "Ship onboarding redesign",
      description: "",
      status: "NOT_STARTED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = workflowSchema.safeParse({
      name: "",
      description: "",
      status: "NOT_STARTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 120 characters", () => {
    const result = workflowSchema.safeParse({
      name: "a".repeat(121),
      description: "",
      status: "NOT_STARTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a description over 2000 characters", () => {
    const result = workflowSchema.safeParse({
      name: "Valid name",
      description: "a".repeat(2001),
      status: "NOT_STARTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = workflowSchema.safeParse({
      name: "Valid name",
      description: "",
      status: "ARCHIVED",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from the name", () => {
    const result = workflowSchema.safeParse({
      name: "  Valid name  ",
      description: "",
      status: "NOT_STARTED",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Valid name");
    }
  });

  it("accepts a valid due date and assignee", () => {
    const result = workflowSchema.safeParse({
      name: "Valid name",
      description: "",
      status: "NOT_STARTED",
      dueDate: "2026-08-20",
      assigneeId: "user_123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty-string due date and assignee (both optional)", () => {
    const result = workflowSchema.safeParse({
      name: "Valid name",
      description: "",
      status: "NOT_STARTED",
      dueDate: "",
      assigneeId: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a missing due date and assignee entirely", () => {
    const result = workflowSchema.safeParse({
      name: "Valid name",
      description: "",
      status: "NOT_STARTED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a due date that isn't a real calendar date", () => {
    const result = workflowSchema.safeParse({
      name: "Valid name",
      description: "",
      status: "NOT_STARTED",
      dueDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
