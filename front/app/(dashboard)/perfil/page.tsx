"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  User,
  Activity,
  Heart,
  Utensils,
  Save,
  CheckCircle,
} from "lucide-react";

type Gender = "MALE" | "FEMALE" | "OTHER";
type NutritionalGoal =
  | "LOSE_WEIGHT"
  | "MAINTAIN"
  | "GAIN_MUSCLE"
  | "CONTROL_GLYCEMIA";
type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "INTENSE";
type DietType = "OMNIVORE" | "VEGETARIAN" | "VEGAN";

interface ProfileForm {
  birthDate: string;
  gender: Gender | "";
  heightCm: string;
  weightKg: string;
  goal: NutritionalGoal | "";
  activityLevel: ActivityLevel | "";
  glp1Medication: string;
  glp1StartDate: string;
  dietType: DietType | "";
  allergies: string;
  intolerances: string;
  medicalConditions: string;
  otherMedications: string;
  mealFrequency: string;
  foodDislikes: string;
  occupation: string;
}

const EMPTY: ProfileForm = {
  birthDate: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  goal: "",
  activityLevel: "",
  glp1Medication: "",
  glp1StartDate: "",
  dietType: "",
  allergies: "",
  intolerances: "",
  medicalConditions: "",
  otherMedications: "",
  mealFrequency: "",
  foodDislikes: "",
  occupation: "",
};

function toForm(data: any): ProfileForm {
  return {
    birthDate: data.birthDate ? data.birthDate.substring(0, 10) : "",
    gender: data.gender ?? "",
    heightCm: data.heightCm?.toString() ?? "",
    weightKg: data.weightKg?.toString() ?? "",
    goal: data.goal ?? "",
    activityLevel: data.activityLevel ?? "",
    glp1Medication: data.glp1Medication ?? "",
    glp1StartDate: data.glp1StartDate
      ? data.glp1StartDate.substring(0, 10)
      : "",
    dietType: data.dietType ?? "",
    allergies: data.allergies ?? "",
    intolerances: data.intolerances ?? "",
    medicalConditions: data.medicalConditions ?? "",
    otherMedications: data.otherMedications ?? "",
    mealFrequency: data.mealFrequency?.toString() ?? "",
    foodDislikes: data.foodDislikes ?? "",
    occupation: data.occupation ?? "",
  };
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-2 border-b border-gray-100">
      <span className="text-green-600">{icon}</span>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500";
const selectClass = inputClass + " bg-white";
const textareaClass = inputClass + " resize-none";

export default function PerfilPage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/profile/nutritional")
      .then((r) => {
        if (r.data) setForm(toForm(r.data));
      })
      .finally(() => setLoading(false));
  }, []);

  const set =
    (field: keyof ProfileForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.put("/profile/nutritional", {
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        heightCm: form.heightCm ? parseInt(form.heightCm) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        goal: form.goal || undefined,
        activityLevel: form.activityLevel || undefined,
        glp1Medication: form.glp1Medication || undefined,
        glp1StartDate: form.glp1StartDate || undefined,
        dietType: form.dietType || undefined,
        allergies: form.allergies || undefined,
        intolerances: form.intolerances || undefined,
        medicalConditions: form.medicalConditions || undefined,
        otherMedications: form.otherMedications || undefined,
        mealFrequency: form.mealFrequency
          ? parseInt(form.mealFrequency)
          : undefined,
        foodDislikes: form.foodDislikes || undefined,
        occupation: form.occupation || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Meu perfil nutricional
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Essas informações personalizam as orientações geradas pela IA para
          você.
        </p>
      </div>

      <div className="space-y-8">
        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle
            icon={<User className="w-5 h-5" />}
            title="Dados pessoais"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de nascimento">
              <input
                type="date"
                value={form.birthDate}
                onChange={set("birthDate")}
                className={inputClass}
              />
            </Field>
            <Field label="Sexo">
              <select
                value={form.gender}
                onChange={set("gender")}
                className={selectClass}
              >
                <option value="">Selecione</option>
                <option value="FEMALE">Feminino</option>
                <option value="MALE">Masculino</option>
                <option value="OTHER">Outro</option>
              </select>
            </Field>
            <Field label="Altura (cm)">
              <input
                type="number"
                placeholder="Ex: 165"
                value={form.heightCm}
                onChange={set("heightCm")}
                className={inputClass}
              />
            </Field>
            <Field label="Peso atual (kg)">
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 82.5"
                value={form.weightKg}
                onChange={set("weightKg")}
                className={inputClass}
              />
            </Field>
            <Field label="Profissão">
              <input
                type="text"
                placeholder="Ex: Professora, Enfermeiro, Autônomo..."
                value={form.occupation}
                onChange={set("occupation")}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* GLP-1 e objetivo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle
            icon={<Activity className="w-5 h-5" />}
            title="GLP-1 e objetivo"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Medicamento GLP-1 em uso">
              <input
                type="text"
                placeholder="Ex: Ozempic 0.5mg"
                value={form.glp1Medication}
                onChange={set("glp1Medication")}
                className={inputClass}
              />
            </Field>
            <Field label="Início do uso">
              <input
                type="date"
                value={form.glp1StartDate}
                onChange={set("glp1StartDate")}
                className={inputClass}
              />
            </Field>
            <Field label="Objetivo principal">
              <select
                value={form.goal}
                onChange={set("goal")}
                className={selectClass}
              >
                <option value="">Selecione</option>
                <option value="LOSE_WEIGHT">Perda de peso</option>
                <option value="MAINTAIN">Manutenção</option>
                <option value="GAIN_MUSCLE">Ganho de massa muscular</option>
                <option value="CONTROL_GLYCEMIA">Controle glicêmico</option>
              </select>
            </Field>
            <Field label="Nível de atividade física">
              <select
                value={form.activityLevel}
                onChange={set("activityLevel")}
                className={selectClass}
              >
                <option value="">Selecione</option>
                <option value="SEDENTARY">Sedentário(a)</option>
                <option value="LIGHT">Levemente ativo(a)</option>
                <option value="MODERATE">Moderadamente ativo(a)</option>
                <option value="INTENSE">Muito ativo(a)</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Saúde */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle icon={<Heart className="w-5 h-5" />} title="Saúde" />
          <div className="space-y-4">
            <Field label="Condições de saúde">
              <textarea
                rows={2}
                placeholder="Ex: Diabetes tipo 2, hipotireoidismo..."
                value={form.medicalConditions}
                onChange={set("medicalConditions")}
                className={textareaClass}
              />
            </Field>
            <Field label="Outros medicamentos em uso">
              <textarea
                rows={2}
                placeholder="Ex: Metformina 500mg, levotiroxina..."
                value={form.otherMedications}
                onChange={set("otherMedications")}
                className={textareaClass}
              />
            </Field>
          </div>
        </div>

        {/* Alimentação */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle
            icon={<Utensils className="w-5 h-5" />}
            title="Alimentação"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de alimentação">
              <select
                value={form.dietType}
                onChange={set("dietType")}
                className={selectClass}
              >
                <option value="">Selecione</option>
                <option value="OMNIVORE">Onívora</option>
                <option value="VEGETARIAN">Vegetariana</option>
                <option value="VEGAN">Vegana</option>
              </select>
            </Field>
            <Field label="Refeições por dia">
              <input
                type="number"
                min="1"
                max="10"
                placeholder="Ex: 4"
                value={form.mealFrequency}
                onChange={set("mealFrequency")}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="space-y-4 mt-4">
            <Field label="Alergias alimentares">
              <textarea
                rows={2}
                placeholder="Ex: Amendoim, frutos do mar..."
                value={form.allergies}
                onChange={set("allergies")}
                className={textareaClass}
              />
            </Field>
            <Field label="Intolerâncias">
              <textarea
                rows={2}
                placeholder="Ex: Lactose, glúten..."
                value={form.intolerances}
                onChange={set("intolerances")}
                className={textareaClass}
              />
            </Field>
            <Field label="Alimentos que não gosta">
              <textarea
                rows={2}
                placeholder="Ex: Fígado, beterraba..."
                value={form.foodDislikes}
                onChange={set("foodDislikes")}
                className={textareaClass}
              />
            </Field>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Perfil salvo com sucesso!
          </div>
        )}
      </div>
    </div>
  );
}
