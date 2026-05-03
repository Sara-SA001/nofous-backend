/*
  Warnings:

  - You are about to drop the column `document_url` on the `death_requests` table. All the data in the column will be lost.
  - You are about to drop the column `request_date` on the `death_requests` table. All the data in the column will be lost.
  - Added the required column `requester_id` to the `death_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "death_requests" DROP COLUMN "document_url",
DROP COLUMN "request_date",
ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "checked_at" TIMESTAMP(3),
ADD COLUMN     "death_announcement_url" TEXT,
ADD COLUMN     "death_report_url" TEXT,
ADD COLUMN     "family_record_url" TEXT,
ADD COLUMN     "requester_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "death_requests" ADD CONSTRAINT "death_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
