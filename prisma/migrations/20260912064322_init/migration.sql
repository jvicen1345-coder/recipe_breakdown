-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "estimatedPriceUsd" REAL,
    "ingredientsJson" TEXT NOT NULL,
    "instructionsJson" TEXT NOT NULL,
    "tipsJson" TEXT,
    "confidenceNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_sourceUrl_key" ON "Recipe"("sourceUrl");
