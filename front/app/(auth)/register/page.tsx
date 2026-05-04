"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ChevronRight, ChevronLeft, Check } from "lucide-react";

// ── Step 1 schema ────────────────────────────────────────────────────────────
const accountSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type AccountData = z.infer<typeof accountSchema>;

// ── Tipos do perfil nutricional ──────────────────────────────────────────────
type Gender = "MALE" | "FEMALE" | "OTHER";
type Goal = "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_MUSCLE" | "CONTROL_GLYCEMIA";
type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "INTENSE";

interface PersonalData {
  birthDate: string;
  gender: Gender | "";
  heightCm: string;
  weightKg: string;
}

interface TreatmentData {
  goal: Goal | "";
  activityLevel: ActivityLevel | "";
  glp1Medication: string;
  glp1StartDate: string;
}

// ── Opções ───────────────────────────────────────────────────────────────────
const GENDERS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Feminino" },
  { value: "MALE", label: "Masculino" },
  { value: "OTHER", label: "Outro" },
];

const GOALS: { value: Goal; label: string; desc: string }[] = [
  {
    value: "LOSE_WEIGHT",
    label: "Perder peso",
    desc: "Reduzir gordura corporal",
  },
  { value: "MAINTAIN", label: "Manter peso", desc: "Manter composição atual" },
  {
    value: "GAIN_MUSCLE",
    label: "Ganhar músculo",
    desc: "Aumentar massa magra",
  },
  {
    value: "CONTROL_GLYCEMIA",
    label: "Controlar glicemia",
    desc: "Gestão da glicose",
  },
];

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: "SEDENTARY", label: "Sedentário" },
  { value: "LIGHT", label: "Leve (1–2x/sem)" },
  { value: "MODERATE", label: "Moderado (3–4x/sem)" },
  { value: "INTENSE", label: "Intenso (5+/sem)" },
];

const STEPS = [
  { n: 1, label: "Conta" },
  { n: 2, label: "Perfil" },
  { n: 3, label: "Tratamento" },
];

// ── Componente principal ─────────────────────────────────────────────────────
export default function RegisterPage() {
  const { setAuth, token } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step2Error, setStep2Error] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [personal, setPersonal] = useState<PersonalData>({
    birthDate: "",
    gender: "",
    heightCm: "",
    weightKg: "",
  });

  const [treatment, setTreatment] = useState<TreatmentData>({
    goal: "",
    activityLevel: "",
    glp1Medication: "",
    glp1StartDate: "",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AccountData>({ resolver: zodResolver(accountSchema) });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onCreateAccount = async (data: AccountData) => {
    try {
      const res = await api.post("/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setAuth(res.data.user, res.data.token);
      setStep(2);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao cadastrar";
      setError("root", { message });
    }
  };

  const saveProfile = async (extra?: Partial<TreatmentData>) => {
    const payload: Record<string, unknown> = {};
    if (personal.birthDate) payload.birthDate = personal.birthDate;
    if (personal.gender) payload.gender = personal.gender;
    if (personal.heightCm) payload.heightCm = parseInt(personal.heightCm);
    if (personal.weightKg) payload.weightKg = parseFloat(personal.weightKg);
    const t = extra ? { ...treatment, ...extra } : treatment;
    if (t.goal) payload.goal = t.goal;
    if (t.activityLevel) payload.activityLevel = t.activityLevel;
    if (t.glp1Medication) payload.glp1Medication = t.glp1Medication;
    if (t.glp1StartDate) payload.glp1StartDate = t.glp1StartDate;

    if (Object.keys(payload).length === 0) return;
    await api.put("/profile/nutritional", payload);
  };

  const goToPlanos = () => router.push("/planos");

  const handleStep2Next = async () => {
    setStep2Error("");
    if (personal.birthDate && personal.birthDate > today) {
      setStep2Error("A data de nascimento não pode ser no futuro.");
      return;
    }
    setSaving(true);
    try {
      await saveProfile();
    } catch {
      /* não bloqueia */
    } finally {
      setSaving(false);
    }
    setStep(3);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveProfile();
    } catch {
      /* não bloqueia */
    } finally {
      setSaving(false);
    }
    goToPlanos();
  };

  // ── Conteúdo lateral direito por step ─────────────────────────────────────
  const sideContent = [
    {
      title: "Nutrição especializada em GLP-1",
      body: "Acompanhamento personalizado com a nutricionista Elane Oliveira para otimizar os resultados do seu tratamento.",
    },
    {
      title: "Orientações no seu ritmo",
      body: "Seus dados nos ajudam a personalizar cada orientação nutricional de acordo com seu perfil.",
    },
    {
      title: "Suporte especializado em GLP-1",
      body: "Saber qual medicamento e quando você iniciou nos permite antecipar sintomas e ajustar sua alimentação.",
    },
  ][step - 1];

  return (
    <div className="min-h-screen flex">
      {/* ── Formulário ── */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-8 sm:px-16 lg:px-24 py-12 bg-white overflow-y-auto">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">
                M
              </span>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">
              MinhaNutri <span className="text-green-600">Online</span>
            </span>
          </Link>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  step > s.n
                    ? "bg-green-600 text-white"
                    : step === s.n
                      ? "bg-green-600 text-white ring-4 ring-green-100"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${step === s.n ? "text-green-600" : "text-gray-400"}`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px w-8 mx-1 ${step > s.n ? "bg-green-400" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Criar conta ── */}
        {step === 1 && (
          <div>
            <div className="mb-7">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Crie sua conta
              </h1>
              <p className="text-gray-500 text-sm">Leva menos de 1 minuto</p>
            </div>

            <form
              onSubmit={handleSubmit(onCreateAccount)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome completo
                </label>
                <input
                  {...register("name")}
                  autoComplete="name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  placeholder="Seu nome"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    {...register("confirmPassword")}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {errors.root && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{errors.root.message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  "Criando conta..."
                ) : (
                  <>
                    Criar conta <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Já tem conta?{" "}
              <Link
                href="/login"
                className="text-green-600 font-semibold hover:text-green-700 transition-colors"
              >
                Entrar
              </Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: Dados pessoais ── */}
        {step === 2 && (
          <div>
            <div className="mb-7">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Sobre você
              </h1>
              <p className="text-gray-500 text-sm">
                Ajuda a personalizar suas orientações nutricionais
              </p>
            </div>

            <div className="space-y-5">
              {/* Sexo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sexo
                </label>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() =>
                        setPersonal((p) => ({ ...p, gender: g.value }))
                      }
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        personal.gender === g.value
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data de nascimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Data de nascimento
                </label>
                <input
                  type="date"
                  value={personal.birthDate}
                  max={today}
                  onChange={(e) => {
                    setStep2Error("");
                    setPersonal((p) => ({ ...p, birthDate: e.target.value }));
                  }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
                />
                {step2Error && (
                  <p className="text-red-500 text-xs mt-1.5">{step2Error}</p>
                )}
              </div>

              {/* Altura e peso */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={personal.heightCm}
                    min={100}
                    max={250}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, heightCm: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="ex: 165"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={personal.weightKg}
                    min={30}
                    max={300}
                    step={0.1}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, weightKg: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="ex: 72"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={handleStep2Next}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  "Salvando..."
                ) : (
                  <>
                    Continuar <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Pular
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Tratamento GLP-1 ── */}
        {step === 3 && (
          <div>
            <div className="mb-7">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Seu tratamento
              </h1>
              <p className="text-gray-500 text-sm">
                Personaliza as orientações para o seu uso de GLP-1
              </p>
            </div>

            <div className="space-y-5">
              {/* Objetivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivo principal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() =>
                        setTreatment((t) => ({ ...t, goal: g.value }))
                      }
                      className={`text-left p-3 rounded-xl border transition-all ${
                        treatment.goal === g.value
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <p className="text-sm font-semibold leading-tight">
                        {g.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${treatment.goal === g.value ? "text-green-100" : "text-gray-400"}`}
                      >
                        {g.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nível de atividade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível de atividade física
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVITY.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() =>
                        setTreatment((t) => ({ ...t, activityLevel: a.value }))
                      }
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        treatment.activityLevel === a.value
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicamento GLP-1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Medicamento GLP-1{" "}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={treatment.glp1Medication}
                  onChange={(e) =>
                    setTreatment((t) => ({
                      ...t,
                      glp1Medication: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  placeholder="ex: Ozempic, Wegovy, Mounjaro..."
                />
              </div>

              {/* Data início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Início do tratamento{" "}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={treatment.glp1StartDate}
                  onChange={(e) =>
                    setTreatment((t) => ({
                      ...t,
                      glp1StartDate: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  "Salvando..."
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Concluir cadastro
                  </>
                )}
              </button>
              <button
                onClick={goToPlanos}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Pular
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Imagem lateral ── */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden">
        <Image
          src="/images/background-login.avif"
          alt="Nutrição saudável"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/60 via-green-800/30 to-transparent" />

        <div className="absolute bottom-12 left-10 right-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <p className="text-white font-semibold text-lg leading-snug mb-1">
              {sideContent.title}
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              {sideContent.body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
