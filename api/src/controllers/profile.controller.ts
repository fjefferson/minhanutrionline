import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../lib/prisma";
import {
  Gender,
  NutritionalGoal,
  ActivityLevel,
  DietType,
} from "@prisma/client";

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;

  const profile = await prisma.nutritionalProfile.findUnique({
    where: { userId },
  });

  res.json(profile ?? null);
}

export async function upsertProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;

  const {
    birthDate,
    gender,
    heightCm,
    weightKg,
    goal,
    activityLevel,
    glp1Medication,
    glp1StartDate,
    dietType,
    allergies,
    intolerances,
    medicalConditions,
    otherMedications,
    mealFrequency,
    foodDislikes,
    occupation,
  } = req.body as {
    birthDate?: string;
    gender?: Gender;
    heightCm?: number;
    weightKg?: number;
    goal?: NutritionalGoal;
    activityLevel?: ActivityLevel;
    glp1Medication?: string;
    glp1StartDate?: string;
    dietType?: DietType;
    allergies?: string;
    intolerances?: string;
    medicalConditions?: string;
    otherMedications?: string;
    mealFrequency?: number;
    foodDislikes?: string;
    occupation?: string;
  };

  const data = {
    birthDate: birthDate ? new Date(birthDate) : null,
    gender: gender ?? null,
    heightCm: heightCm ?? null,
    weightKg: weightKg ?? null,
    goal: goal ?? null,
    activityLevel: activityLevel ?? null,
    glp1Medication: glp1Medication ?? null,
    glp1StartDate: glp1StartDate ? new Date(glp1StartDate) : null,
    dietType: dietType ?? null,
    allergies: allergies ?? null,
    intolerances: intolerances ?? null,
    medicalConditions: medicalConditions ?? null,
    otherMedications: otherMedications ?? null,
    mealFrequency: mealFrequency ?? null,
    foodDislikes: foodDislikes ?? null,
    occupation: occupation ?? null,
  };

  const profile = await prisma.nutritionalProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  res.json(profile);
}
