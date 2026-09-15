-- CreateTable
CREATE TABLE "MadeItPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoWidth" INTEGER NOT NULL,
    "photoHeight" INTEGER NOT NULL,
    "caption" TEXT,
    "rating" INTEGER NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MadeItPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MadeItHeart" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MadeItHeart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MadeItReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MadeItReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MadeItHeart_postId_userId_key" ON "MadeItHeart"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MadeItReport_postId_reporterUserId_key" ON "MadeItReport"("postId", "reporterUserId");

-- AddForeignKey
ALTER TABLE "MadeItPost" ADD CONSTRAINT "MadeItPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MadeItPost" ADD CONSTRAINT "MadeItPost_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MadeItHeart" ADD CONSTRAINT "MadeItHeart_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MadeItPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MadeItHeart" ADD CONSTRAINT "MadeItHeart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MadeItReport" ADD CONSTRAINT "MadeItReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MadeItPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MadeItReport" ADD CONSTRAINT "MadeItReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
