-- DropIndex
DROP INDEX "PantryItem_name_key";

-- DropIndex
DROP INDEX "Recipe_sourceUrl_key";

-- AlterTable
ALTER TABLE "CookLog" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "PantryItem" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "showThisWeekCard" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_userId_name_key" ON "PantryItem"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_userId_sourceUrl_key" ON "Recipe"("userId", "sourceUrl");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookLog" ADD CONSTRAINT "CookLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

