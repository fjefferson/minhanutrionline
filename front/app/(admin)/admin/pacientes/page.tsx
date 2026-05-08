"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Search,
  User,
  Activity,
  Heart,
  Utensils,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Gender = "MALE" | "FEMALE" | "OTHER";
type NutritionalGoal =
  | "LOSE_WEIGHT"
  | "MAINTAIN"
  | "GAIN_MUSCLE"
  | "CONTROL_GLYCEMIA";
type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "INTENSE";
type DietType = "OMNIVORE" | "VEGETARIAN" | "VEGAN";

interface UserListItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  nutritionalProfile: {
    id: string;
    gender: Gender | null;
    heightCm: number | null;
    weightKg: number | null;
    goal: NutritionalGoal | null;
    birthDate: string | null;
  } | null;
}

interface NutritionalProfile {
  id: string;
  userId: string;
  birthDate: string | null;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: NutritionalGoal | null;
  activityLevel: ActivityLevel | null;
  glp1Medication: string | null;
  glp1StartDate: string | null;
  dietType: DietType | null;
  allergies: string | null;
  intolerances: string | null;
  medicalConditions: string | null;
  otherMedications: string | null;
  mealFrequency: number | null;
  foodDislikes: string | null;
  occupation: string | null;
  updatedAt: string;
  user: { name: string; email: string };
}

// ─── Label helpers ────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: "Feminino",
  MALE: "Masculino",
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

function isProfileComplete(p: UserListItem["nutritionalProfile"]): boolean {
  if (!p) return false;
  return !!(p.gender && p.heightCm && p.weightKg && p.goal);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <span className="text-green-600">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

// ─── Profile Panel ────────────────────────────────────────────────────────────

function ProfilePanel({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<NutritionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      setNotFound(false);
      api
        .get<NutritionalProfile>(`/admin/users/${userId}/profile`)
        .then((r) => setProfile(r.data))
        .catch((e) => {
          if (e?.response?.status === 404) setNotFound(true);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, [userId]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative z-50 w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{userName}</h2>
            <p className="text-xs text-gray-400">Anamnese nutricional</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex-1">
          {loading && (
            <p className="text-sm text-gray-400">Carregando perfil...</p>
          )}

          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <AlertCircle size={40} className="text-amber-400" />
              <p className="text-sm font-medium text-gray-600">
                Paciente ainda não preencheu a anamnese
              </p>
            </div>
          )}

          {!loading && profile && (
            <div className="space-y-6">
              {/* Dados pessoais */}
              <div className="bg-gray-50 rounded-xl p-4">
                <SectionTitle
                  icon={<User size={15} />}
                  title="Dados pessoais"
                />
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    label="Sexo"
                    value={profile.gender ? GENDER_LABEL[profile.gender] : null}
                  />
                  <InfoRow
                    label="Data de nascimento"
                    value={formatDate(profile.birthDate)}
                  />
                  <InfoRow
                    label="Altura"
                    value={profile.heightCm ? `${profile.heightCm} cm` : null}
                  />
                  <InfoRow
                    label="Peso"
                    value={profile.weightKg ? `${profile.weightKg} kg` : null}
                  />
                  <InfoRow label="Profissão" value={profile.occupation} />
                </div>
              </div>

              {/* GLP-1 e objetivo */}
              <div className="bg-gray-50 rounded-xl p-4">
                <SectionTitle
                  icon={<Activity size={15} />}
                  title="GLP-1 e objetivo"
                />
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    label="Objetivo"
                    value={profile.goal ? GOAL_LABEL[profile.goal] : null}
                  />
                  <InfoRow
                    label="Nível de atividade"
                    value={
                      profile.activityLevel
                        ? ACTIVITY_LABEL[profile.activityLevel]
                        : null
                    }
                  />
                  <InfoRow
                    label="Medicamento GLP-1"
                    value={profile.glp1Medication}
                  />
                  <InfoRow
                    label="Início do GLP-1"
                    value={formatDate(profile.glp1StartDate)}
                  />
                </div>
              </div>

              {/* Saúde */}
              <div className="bg-gray-50 rounded-xl p-4">
                <SectionTitle icon={<Heart size={15} />} title="Saúde" />
                <div className="space-y-3">
                  <InfoRow
                    label="Condições de saúde"
                    value={profile.medicalConditions}
                  />
                  <InfoRow
                    label="Outros medicamentos"
                    value={profile.otherMedications}
                  />
                </div>
              </div>

              {/* Alimentação */}
              <div className="bg-gray-50 rounded-xl p-4">
                <SectionTitle
                  icon={<Utensils size={15} />}
                  title="Alimentação"
                />
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    label="Tipo de alimentação"
                    value={
                      profile.dietType ? DIET_LABEL[profile.dietType] : null
                    }
                  />
                  <InfoRow
                    label="Refeições por dia"
                    value={profile.mealFrequency}
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <InfoRow label="Alergias" value={profile.allergies} />
                  <InfoRow label="Intolerâncias" value={profile.intolerances} />
                  <InfoRow
                    label="Alimentos que não gosta"
                    value={profile.foodDislikes}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 text-right">
                Última atualização: {formatDate(profile.updatedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PacientesPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<UserListItem[]>("/admin/users", {
        params: q ? { q } : {},
      });
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsers(debouncedQuery);
    }, 0);
    return () => clearTimeout(timeout);
  }, [debouncedQuery, loadUsers]);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Busque e visualize a anamnese nutricional dos pacientes.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {/* List */}
      {loading && (
        <p className="text-sm text-gray-400 py-6 text-center">Buscando...</p>
      )}

      {!loading && users.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          Nenhum paciente encontrado.
        </p>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-2">
          {users.map((u) => {
            const complete = isProfileComplete(u.nutritionalProfile);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUser({ id: u.id, name: u.name })}
                className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-green-300 hover:shadow-sm transition text-left"
              >
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="shrink-0">
                  {complete ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 size={12} /> Completo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                      <AlertCircle size={12} /> Incompleto
                    </span>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Profile side panel */}
      {selectedUser && (
        <ProfilePanel
          userId={selectedUser.id}
          userName={selectedUser.name}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
