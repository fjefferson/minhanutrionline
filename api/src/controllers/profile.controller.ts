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

  const body = req.body as {
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

  const data: Record<string, unknown> = {};
  if ("birthDate" in body)
    data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  if ("gender" in body) data.gender = body.gender ?? null;
  if ("heightCm" in body) data.heightCm = body.heightCm ?? null;
  if ("weightKg" in body) data.weightKg = body.weightKg ?? null;
  if ("goal" in body) data.goal = body.goal ?? null;
  if ("activityLevel" in body) data.activityLevel = body.activityLevel ?? null;
  if ("glp1Medication" in body)
    data.glp1Medication = body.glp1Medication ?? null;
  if ("glp1StartDate" in body)
    data.glp1StartDate = body.glp1StartDate
      ? new Date(body.glp1StartDate)
      : null;
  if ("dietType" in body) data.dietType = body.dietType ?? null;
  if ("allergies" in body) data.allergies = body.allergies ?? null;
  if ("intolerances" in body) data.intolerances = body.intolerances ?? null;
  if ("medicalConditions" in body)
    data.medicalConditions = body.medicalConditions ?? null;
  if ("otherMedications" in body)
    data.otherMedications = body.otherMedications ?? null;
  if ("mealFrequency" in body) data.mealFrequency = body.mealFrequency ?? null;
  if ("foodDislikes" in body) data.foodDislikes = body.foodDislikes ?? null;
  if ("occupation" in body) data.occupation = body.occupation ?? null;

  const profile = await prisma.nutritionalProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  res.json(profile);
}
