-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('FATHER_LINK', 'HUSBAND_LINK');

-- CreateTable
CREATE TABLE "family_link_requests" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "type" "LinkType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "document1_url" TEXT,
    "document2_url" TEXT,
    "notes" TEXT,
    "admin_notes" TEXT,
    "checked_by_id" INTEGER,
    "checked_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_link_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "family_link_requests" ADD CONSTRAINT "family_link_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_link_requests" ADD CONSTRAINT "family_link_requests_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_link_requests" ADD CONSTRAINT "family_link_requests_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
