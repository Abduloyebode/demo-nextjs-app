"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationMembership } from "@/lib/organisation";
import { workflowSchema } from "@/lib/workflow-validation";
import {
  createWorkflowForOrg,
  deleteWorkflowForOrg,
  restoreWorkflowForOrg,
  revertWorkflowStatusForOrg,
  updateWorkflowForOrg,
  type WorkflowActionResult,
} from "@/lib/workflow-admin";

export type { WorkflowActionResult };

function parseWorkflowForm(formData: FormData) {
  return workflowSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    assigneeId: formData.get("assigneeId"),
  });
}

export async function createWorkflow(
  formData: FormData,
): Promise<WorkflowActionResult> {
  const ctx = await requireOrganisationMembership();
  const parsed = parseWorkflowForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const result = await createWorkflowForOrg(ctx, parsed.data);
  if (result.error === null) {
    revalidatePath("/dashboard");
  }
  return result;
}

export async function updateWorkflow(
  id: string,
  formData: FormData,
): Promise<WorkflowActionResult> {
  const ctx = await requireOrganisationMembership();
  const parsed = parseWorkflowForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const result = await updateWorkflowForOrg(ctx, id, parsed.data);
  if (result.error === null) {
    revalidatePath("/dashboard");
  }
  return result;
}

export async function deleteWorkflow(id: string): Promise<WorkflowActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await deleteWorkflowForOrg(ctx, id);
  if (result.error === null) {
    revalidatePath("/dashboard");
  }
  return result;
}

export async function restoreWorkflow(id: string): Promise<WorkflowActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await restoreWorkflowForOrg(ctx, id);
  if (result.error === null) {
    revalidatePath("/dashboard");
  }
  return result;
}

export async function revertWorkflowStatus(
  id: string,
): Promise<WorkflowActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await revertWorkflowStatusForOrg(ctx, id);
  if (result.error === null) {
    revalidatePath("/dashboard");
  }
  return result;
}
