-- DropIndex
DROP INDEX "document_organisationId_idx";

-- DropIndex
DROP INDEX "workflow_organisationId_idx";

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "workflow" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "previousStatus" "WorkflowStatus";

-- CreateIndex
CREATE INDEX "document_organisationId_deletedAt_idx" ON "document"("organisationId", "deletedAt");

-- CreateIndex
CREATE INDEX "workflow_organisationId_deletedAt_idx" ON "workflow"("organisationId", "deletedAt");
