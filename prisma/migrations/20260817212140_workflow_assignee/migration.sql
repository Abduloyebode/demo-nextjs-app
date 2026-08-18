-- AlterTable
ALTER TABLE "workflow" ADD COLUMN     "assigneeId" TEXT;

-- CreateIndex
CREATE INDEX "workflow_assigneeId_idx" ON "workflow"("assigneeId");

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
