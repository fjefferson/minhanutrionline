-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "NutritionalGoal" AS ENUM ('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE', 'CONTROL_GLYCEMIA');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'INTENSE');

-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN');

-- CreateTable
CREATE TABLE "NutritionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "heightCm" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "goal" "NutritionalGoal",
    "activityLevel" "ActivityLevel",
    "glp1Medication" TEXT,
    "glp1StartDate" TIMESTAMP(3),
    "dietType" "DietType",
    "allergies" TEXT,
    "intolerances" TEXT,
    "medicalConditions" TEXT,
    "otherMedications" TEXT,
    "mealFrequency" INTEGER,
    "foodDislikes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionalProfile_userId_key" ON "NutritionalProfile"("userId");

-- AddForeignKey
ALTER TABLE "NutritionalProfile" ADD CONSTRAINT "NutritionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
