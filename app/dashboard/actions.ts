"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganisationMembership } from "@/lib/organisation";
import { workflowSchema } from "@/lib/workflow-validation";

export type WorkflowActionResult = { error: string | null };

function parseWorkflowForm(formData: FormData) {
  return workflowSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
  });
}

export async function createWorkflow(
  formData: FormData,
): Promise<WorkflowActionResult> {
  const { userId, organisationId } = await requireOrganisationMembership();
  const parsed = parseWorkflowForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  await prisma.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: parsed.data.status,
      ownerId: userId,
      organisationId,
    },
  });

  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateWorkflow(
  id: string,
  formData: FormData,
): Promise<WorkflowActionResult> {
  const { organisationId } = await requireOrganisationMembership();
  const parsed = parseWorkflowForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const result = await prisma.workflow.updateMany({
    where: { id, organisationId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: parsed.data.status,
    },
  });

  if (result.count === 0) {
    return { error: "That workflow could not be found." };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteWorkflow(id: string): Promise<WorkflowActionResult> {
  const { organisationId } = await requireOrganisationMembership();

  const result = await prisma.workflow.deleteMany({
    where: { id, organisationId },
  });

  if (result.count === 0) {
    return { error: "That workflow could not be found." };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
