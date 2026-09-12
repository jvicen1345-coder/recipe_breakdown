-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorHandle" TEXT,
    "thumbnailPath" TEXT,
    "caption" TEXT,
    "transcript" TEXT,
    "userNotes" TEXT,
    "durationSeconds" INTEGER,
    "servings" INTEGER,
    "totalTimeMinutes" INTEGER,
    "difficulty" TEXT,
    "proteinType" TEXT,
    "dietType" TEXT,
    "priceLevel" TEXT,
    "estimatedPriceUsd" DOUBLE PRECISION,
    "ingredientsJson" TEXT NOT NULL,
    "instructionsJson" TEXT NOT NULL,
    "tipsJson" TEXT,
    "confidenceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_sourceUrl_key" ON "Recipe"("sourceUrl");
