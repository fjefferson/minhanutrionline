import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env";
import {
  Gender,
  NutritionalGoal,
  ActivityLevel,
  DietType,
} from "@prisma/client";

const MODEL = "gpt-4o-mini";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

export interface PatientProfile {
  birthDate?: Date | null;
  gender?: Gender | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: NutritionalGoal | null;
  activityLevel?: ActivityLevel | null;
  glp1Medication?: string | null;
  glp1StartDate?: Date | null;
  dietType?: DietType | null;
  allergies?: string | null;
  intolerances?: string | null;
  medicalConditions?: string | null;
  otherMedications?: string | null;
  mealFrequency?: number | null;
  foodDislikes?: string | null;
  occupation?: string | null;
}

export interface RagInput {
  symptoms: string[];
  extraNotes: string;
  knowledgeContext: string;
  profile?: PatientProfile | null;
}

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  OTHER: "Outro",
};

const GOAL_LABEL: Record<NutritionalGoal, string> = {
  LOSE_WEIGHT: "Perda de peso",
  MAINTAIN: "Manutenção",
  GAIN_MUSCLE: "Ganho de massa muscular",
  CONTROL_GLYCEMIA: "Controle glicêmico",
};

const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentário(a)",
  LIGHT: "Levemente ativo(a)",
  MODERATE: "Moderadamente ativo(a)",
  INTENSE: "Muito ativo(a)",
};

const DIET_LABEL: Record<DietType, string> = {
  OMNIVORE: "Onívora",
  VEGETARIAN: "Vegetariana",
  VEGAN: "Vegana",
};

function buildProfileContext(profile: PatientProfile): string {
  const lines: string[] = [];

  if (profile.gender) lines.push(`- Sexo: ${GENDER_LABEL[profile.gender]}`);
  if (profile.birthDate) {
    const age = Math.floor(
      (Date.now() - new Date(profile.birthDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25),
    );
    lines.push(`- Idade: ${age} anos`);
  }
  if (profile.heightCm) lines.push(`- Altura: ${profile.heightCm} cm`);
  if (profile.weightKg) lines.push(`- Peso: ${profile.weightKg} kg`);
  if (profile.goal) lines.push(`- Objetivo: ${GOAL_LABEL[profile.goal]}`);
  if (profile.activityLevel)
    lines.push(
      `- Nível de atividade: ${ACTIVITY_LABEL[profile.activityLevel]}`,
    );
  if (profile.glp1Medication)
    lines.push(`- Medicamento GLP-1: ${profile.glp1Medication}`);
  if (profile.glp1StartDate) {
    const months = Math.floor(
      (Date.now() - new Date(profile.glp1StartDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44),
    );
    lines.push(`- Em uso de GLP-1 há aproximadamente ${months} mês(es)`);
  }
  if (profile.dietType)
    lines.push(`- Tipo de dieta: ${DIET_LABEL[profile.dietType]}`);
  if (profile.allergies)
    lines.push(`- Alergias alimentares: ${profile.allergies}`);
  if (profile.intolerances)
    lines.push(`- Intolerâncias: ${profile.intolerances}`);
  if (profile.medicalConditions)
    lines.push(`- Condições de saúde: ${profile.medicalConditions}`);
  if (profile.otherMedications)
    lines.push(`- Outros medicamentos em uso: ${profile.otherMedications}`);
  if (profile.mealFrequency)
    lines.push(`- Frequência de refeições: ${profile.mealFrequency} por dia`);
  if (profile.foodDislikes)
    lines.push(`- Alimentos que não gosta: ${profile.foodDislikes}`);
  if (profile.occupation) lines.push(`- Profissão: ${profile.occupation}`);

  return lines.join("\n");
}

export async function generateNutritionalGuidance(
  input: RagInput,
): Promise<string> {
  const { symptoms, extraNotes, knowledgeContext, profile } = input;

  const profileContext = profile ? buildProfileContext(profile) : null;

  const systemPrompt = `Você é uma nutricionista especializada em pacientes em uso de medicamentos GLP-1 (como semaglutida e liraglutida) para emagrecimento.
Seu papel é fornecer orientações nutricionais personalizadas, empáticas e baseadas em evidências para os sintomas relatados pelo paciente.
Use a base de conhecimento fornecida como referência principal. Seja objetiva, prática e humanizada.
Nunca substitua o acompanhamento médico — sempre incentive o paciente a manter contato com seu médico prescritor.
Responda sempre em português do Brasil.`;

  const userPrompt = `${profileContext ? `Perfil do paciente:\n${profileContext}\n\n` : ""}O paciente relatou os seguintes sintomas após uso de GLP-1:
Sintomas: ${symptoms.length > 0 ? symptoms.join(", ") : "nenhum sintoma específico marcado"}
${extraNotes ? `Observações adicionais: ${extraNotes}` : ""}

Base de conhecimento nutricional relevante:
---
${knowledgeContext || "Nenhum conteúdo específico encontrado para estes sintomas."}
---

Com base nesses sintomas${profileContext ? ", no perfil do paciente" : ""} e na base de conhecimento acima, forneça orientações nutricionais práticas e personalizadas para este paciente.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return (
    response.choices[0]?.message?.content ??
    "Não foi possível gerar uma orientação no momento. Tente novamente."
  );
}
