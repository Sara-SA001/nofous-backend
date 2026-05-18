-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUB_ADMIN');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'SUB_ADMIN';
