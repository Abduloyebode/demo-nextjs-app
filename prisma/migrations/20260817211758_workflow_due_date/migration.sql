-- AlterTable
ALTER TABLE "workflow" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "workflow_organisationId_dueDate_idx" ON "workflow"("organisationId", "dueDate");
