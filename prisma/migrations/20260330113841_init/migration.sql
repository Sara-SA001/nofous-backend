-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('MUSLIM', 'CHRISTIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "MarriageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DIVORCED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "national_id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nisba" TEXT,
    "father_name" TEXT NOT NULL,
    "grandfather_name" TEXT,
    "mother_name" TEXT NOT NULL,
    "mother_nisba" TEXT,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "place_of_birth" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "governorate" TEXT NOT NULL,
    "amanah" TEXT,
    "registration_place" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "religion" "Religion" NOT NULL,
    "marital_status" "MaritalStatus" NOT NULL,
    "card_number" TEXT,
    "issue_date" TIMESTAMP(3),
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT NOT NULL,
    "personal_photo" TEXT,
    "id_front_photo" TEXT,
    "id_back_photo" TEXT,
    "father_id" INTEGER,
    "husband_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marriage_info" (
    "id" SERIAL NOT NULL,
    "husband_id" INTEGER NOT NULL,
    "wife_id" INTEGER NOT NULL,
    "status" "MarriageStatus" NOT NULL DEFAULT 'PENDING',
    "marriage_date" TIMESTAMP(3),
    "notes" TEXT,
    "checked_by_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marriage_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "death_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "death_date" TIMESTAMP(3),
    "notes" TEXT,
    "document_url" TEXT,
    "checked_by_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "death_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_card_number_key" ON "users"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "marriage_info_husband_id_wife_id_key" ON "marriage_info"("husband_id", "wife_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_father_id_fkey" FOREIGN KEY ("father_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_husband_id_fkey" FOREIGN KEY ("husband_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marriage_info" ADD CONSTRAINT "marriage_info_husband_id_fkey" FOREIGN KEY ("husband_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marriage_info" ADD CONSTRAINT "marriage_info_wife_id_fkey" FOREIGN KEY ("wife_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marriage_info" ADD CONSTRAINT "marriage_info_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_requests" ADD CONSTRAINT "death_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_requests" ADD CONSTRAINT "death_requests_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
