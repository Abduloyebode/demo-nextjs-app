-- Recreate enum so PENDING exists and can be used as the default in one migration.
CREATE TYPE "DocumentStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "document"
  ALTER COLUMN "status" TYPE "DocumentStatus_new"
  USING ("status"::text::"DocumentStatus_new");

ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "DocumentStatus_old";

ALTER TABLE "document" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Store PDF bytes until the background worker finishes extraction.
ALTER TABLE "document" ADD COLUMN "fileData" BYTEA;
