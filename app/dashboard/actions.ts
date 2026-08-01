"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user-id";
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
  const userId = await requireUserId();
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
    },
  });

  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateWorkflow(
  id: string,
  formData: FormData,
): Promise<WorkflowActionResult> {
  const userId = await requireUserId();
  const parsed = parseWorkflowForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const result = await prisma.workflow.updateMany({
    where: { id, ownerId: userId },
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
  const userId = await requireUserId();

  const result = await prisma.workflow.deleteMany({
    where: { id, ownerId: userId },
  });

  if (result.count === 0) {
    return { error: "That workflow could not be found." };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
