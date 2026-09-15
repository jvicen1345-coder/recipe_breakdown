-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goalCalories" INTEGER,
ADD COLUMN     "goalCarbs" INTEGER,
ADD COLUMN     "goalFat" INTEGER,
ADD COLUMN     "goalProtein" INTEGER,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proAccessUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ManualMealLog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caloriesPerServing" INTEGER,
    "proteinGrams" INTEGER,
    "carbsGrams" INTEGER,
    "fatGrams" INTEGER,
    "photoUrl" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualMealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySubmission" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cuisineType" TEXT,
    "dietTagsJson" TEXT NOT NULL DEFAULT '[]',
    "cookTimeMinutes" INTEGER,
    "difficulty" TEXT,
    "ingredientsJson" TEXT NOT NULL DEFAULT '[]',
    "instructionsJson" TEXT NOT NULL DEFAULT '[]',
    "story" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "photoWidth" INTEGER,
    "photoHeight" INTEGER,
    "photoFlaggedScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "nutritionJson" TEXT,
    "aiFlagsJson" TEXT NOT NULL DEFAULT '[]',
    "rejectionReason" TEXT,
    "approvedRecipeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CommunitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionVote" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySubmission_approvedRecipeId_key" ON "CommunitySubmission"("approvedRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionVote_submissionId_voterUserId_key" ON "SubmissionVote"("submissionId", "voterUserId");

-- AddForeignKey
ALTER TABLE "CommunitySubmission" ADD CONSTRAINT "CommunitySubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySubmission" ADD CONSTRAINT "CommunitySubmission_approvedRecipeId_fkey" FOREIGN KEY ("approvedRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionVote" ADD CONSTRAINT "SubmissionVote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CommunitySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionVote" ADD CONSTRAINT "SubmissionVote_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
