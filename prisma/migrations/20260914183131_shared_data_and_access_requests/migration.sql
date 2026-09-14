-- DropForeignKey
ALTER TABLE "CookLog" DROP CONSTRAINT "CookLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_userId_fkey";

-- DropForeignKey
ALTER TABLE "PantryItem" DROP CONSTRAINT "PantryItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "Recipe" DROP CONSTRAINT "Recipe_userId_fkey";

-- DropIndex
DROP INDEX "PantryItem_userId_name_key";

-- DropIndex
DROP INDEX "Recipe_userId_sourceUrl_key";

-- AlterTable
ALTER TABLE "CookLog" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "PantryItem" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_email_key" ON "AccessRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_name_key" ON "PantryItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_sourceUrl_key" ON "Recipe"("sourceUrl");

