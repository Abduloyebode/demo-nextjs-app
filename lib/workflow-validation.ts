import { z } from "zod";

export const workflowStatusValues = ["NOT_STARTED", "IN_PROGRESS", "DONE"] as const;

export const workflowStatusLabels: Record<(typeof workflowStatusValues)[number], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const workflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional()
    .or(z.literal("")),
  status: z.enum(workflowStatusValues),
});

export type WorkflowInput = z.infer<typeof workflowSchema>;
