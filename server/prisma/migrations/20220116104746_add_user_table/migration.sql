-- CreateEnum
CREATE TYPE "Status" AS ENUM ('REGISTERED', 'CONFIRMED', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "lastLogoutAt" TIMESTAMP(3),
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "nick" VARCHAR(32) NOT NULL,
    "email" VARCHAR(64) NOT NULL,
    "emailMD5" VARCHAR(32) NOT NULL,
    "password" VARCHAR(128),
    "extAuthId" TEXT,
    "status" "Status" NOT NULL,
    "canUseIRC" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_nick_idx" ON "User"("nick");

-- CreateIndex
CREATE INDEX "User_extAuthId_idx" ON "User"("extAuthId");
