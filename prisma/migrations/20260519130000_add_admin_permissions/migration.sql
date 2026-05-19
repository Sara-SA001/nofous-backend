-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('MANAGE_REGISTRATION_REQUESTS', 'MANAGE_LINK_REQUESTS', 'MANAGE_DEATH_REQUESTS', 'MANAGE_USERS');

-- AlterTable
ALTER TABLE "admins"
ADD COLUMN "permissions" "AdminPermission"[] NOT NULL DEFAULT ARRAY[]::"AdminPermission"[];

-- Backfill existing admins and sub-admins with all permissions for backward compatibility
UPDATE "admins"
SET "permissions" = ARRAY[
  'MANAGE_REGISTRATION_REQUESTS',
  'MANAGE_LINK_REQUESTS',
  'MANAGE_DEATH_REQUESTS',
  'MANAGE_USERS'
]::"AdminPermission"[]
WHERE "permissions" = ARRAY[]::"AdminPermission"[];
