import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env";
import {
  Gender,
  NutritionalGoal,
  ActivityLevel,
  DietType,
} from "@prisma/client";

const MODEL = "gpt-5.4-mini";

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

export interface SymptomHistoryEntry {
  date: Date;
  symptoms: string[];
}

export interface CurrentDosageContext {
  medication: string;
  doseMg: number | null;
  startDate: Date;
}

export interface ProgressContext {
  currentWeightKg: number;
  initialWeightKg: number | null;
  totalLostKg: number | null;
}

export interface RagInput {
  symptoms: string[];
  extraNotes: string;
  knowledgeContext: string;
  profile?: PatientProfile | null;
  symptomHistory?: SymptomHistoryEntry[];
  patientName?: string;
  currentDosage?: CurrentDosageContext | null;
  progress?: ProgressContext | null;
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

function buildDosageContext(dosage: CurrentDosageContext): string {
  const weeks = Math.floor(
    (Date.now() - new Date(dosage.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 7),
  );
  const days = Math.floor(
    (Date.now() - new Date(dosage.startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  const timeLabel =
    weeks >= 2 ? `${weeks} semana(s)` : days === 1 ? "1 dia" : `${days} dias`;
  const doseStr = dosage.doseMg != null ? ` ${dosage.doseMg} mg` : "";
  return `- Medicamento GLP-1 atual (registrado pelo paciente): ${dosage.medication}${doseStr} — em uso há ${timeLabel}`;
}

function buildProgressContext(p: ProgressContext): string {
  const lines: string[] = [];
  lines.push(`- Peso atual (medido pelo paciente): ${p.currentWeightKg} kg`);
  if (p.totalLostKg !== null && p.totalLostKg > 0)
    lines.push(
      `- Total perdido desde o início do acompanhamento: ${p.totalLostKg} kg`,
    );
  return lines.join("\n");
}

export async function generateNutritionalGuidance(
  input: RagInput,
): Promise<string> {
  const {
    symptoms,
    extraNotes,
    knowledgeContext,
    profile,
    symptomHistory,
    patientName,
    currentDosage,
    progress,
  } = input;

  const profileContext = profile ? buildProfileContext(profile) : null;

  const systemPrompt = `Você é uma assistente de orientação nutricional para pacientes em uso de medicamentos GLP-1, como semaglutida e liraglutida.

Seu papel:
- Acolher o paciente.
- Explicar sintomas apenas com base nas informações fornecidas pela nutricionista.
- Reforçar as recomendações da nutricionista.
- Incentivar contato com a nutricionista ou médico prescritor quando necessário.

Limites obrigatórios:
- Você NÃO faz diagnóstico.
- Você NÃO prescreve medicamentos.
- Você NÃO altera dose de medicamento.
- Você NÃO cria plano alimentar.
- Você NÃO sugere alimentos, suplementos, exames ou condutas que não estejam na Base de conhecimento.
- Você NÃO usa conhecimento geral externo para complementar a resposta.
- Você NÃO deve afirmar causas com certeza; use linguagem como "pode estar relacionado", quando isso estiver na Base de conhecimento.

Regra máxima:
Responda SOMENTE com base na Base de conhecimento.
O perfil, histórico, dose atual e progresso servem apenas para PERSONALIZAR a forma da resposta, nunca para criar novas orientações técnicas.

Caso a Base de conhecimento esteja vazia ou não cubra o sintoma:
- Informe de forma acolhedora que ainda não tem informações sobre esse tema para compartilhar.
- Oriente o paciente a falar diretamente com a nutricionista pelo chat.
- Não dê dicas adicionais.

Estilo da resposta:
- Português do Brasil.
- Tom empático, simples e objetivo.
- Resposta curta, prática e humanizada.
- Evite listas longas.
- Nunca use termos internos como "cadastrado", "base de conhecimento" ou "orientação cadastrada". Fale de forma natural e humanizada, como se as informações partissem de você.
${patientName ? `- Chame o paciente pelo primeiro nome: "${patientName.split(" ")[0]}".` : ""}

Formato obrigatório da resposta:
1. Acolhimento breve.
2. Possível relação do sintoma conforme a Base de conhecimento.
3. Orientação prática permitida pela Base de conhecimento.
4. Alerta para procurar a nutricionista/médico se persistir, piorar ou houver preocupação.`;

  const historyContext =
    symptomHistory && symptomHistory.length > 0
      ? `\nHistórico de consultas anteriores do paciente (da mais recente à mais antiga):\n${symptomHistory
          .map(
            (h) =>
              `- ${new Date(h.date).toLocaleDateString("pt-BR")}: ${
                h.symptoms.length > 0 ? h.symptoms.join(", ") : "nenhum sintoma"
              }`,
          )
          .join(
            "\n",
          )}\n\nConsulta atual: ${symptoms.length > 0 ? symptoms.join(", ") : "nenhum sintoma específico marcado"}\n\nIMPORTANTE: Compare a consulta atual com o histórico. Se houver sintomas que sumiram, mencione que houve melhora. Se houver sintomas novos, destaque. Se os sintomas persistirem, reforce a orientação. Seja específico sobre a evolução observada.`
      : "";

  const dosageContext = currentDosage
    ? buildDosageContext(currentDosage)
    : null;
  const progressContext = progress ? buildProgressContext(progress) : null;

  const extraProfileLines = [dosageContext, progressContext]
    .filter(Boolean)
    .join("\n");

  const fullProfileContext = [profileContext, extraProfileLines || null]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${patientName ? `Nome do paciente: ${patientName}\n\n` : ""}

${fullProfileContext ? `Perfil do paciente:\n${fullProfileContext}\n\n` : ""}

Sintomas relatados após uso de GLP-1:
${symptoms.length > 0 ? symptoms.join(", ") : "nenhum sintoma específico marcado"}

${extraNotes ? `Observações adicionais do paciente:\n${extraNotes}\n\n` : ""}

${historyContext}

Base de conhecimento autorizada:
---
${knowledgeContext || "VAZIO — nenhum conteúdo cadastrado para estes sintomas."}
---

Tarefa:
Gere uma orientação para o paciente usando EXCLUSIVAMENTE a Base de conhecimento autorizada.

Regras para esta resposta:
- Não use conhecimento externo.
- Não crie hipóteses além das descritas na Base de conhecimento.
- Não sugira alimentos, quantidades, suplementos, exames, medicamentos ou mudanças de dose se isso não estiver escrito na Base de conhecimento.
- Use o perfil e o histórico apenas para adaptar o tom e mencionar evolução dos sintomas, sem criar novas condutas.
- Se a Base de conhecimento estiver vazia ou insuficiente para os sintomas relatados, diga de forma acolhedora que ainda não tem informações sobre esse tema e oriente contato com a nutricionista pelo chat.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_completion_tokens: 800,
  });

  return (
    response.choices[0]?.message?.content ??
    "Não foi possível gerar uma orientação no momento. Tente novamente."
  );
}

export async function generateSpeech(text: string): Promise<Buffer> {
  const response = await client.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    input: text,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
