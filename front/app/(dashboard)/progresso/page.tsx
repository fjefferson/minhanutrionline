"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingDown,
  Scale,
  Target,
  Activity,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

interface ProgressEntry {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPct: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  notes: string | null;
}

interface Stats {
  totalLost: number | null;
  currentWeight: number | null;
  currentBMI: number | null;
  progressPct: number | null;
  weeklyAvgLoss: number | null;
  totalEntries: number;
}

function bmiLabel(bmi: number | null): string {
  if (bmi === null) return "—";
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
}

function bmiColor(bmi: number | null): string {
  if (bmi === null) return "text-gray-400";
  if (bmi < 18.5) return "text-blue-500";
  if (bmi < 25) return "text-green-500";
  if (bmi < 30) return "text-amber-500";
  return "text-red-500";
}

const defaultForm = {
  recordedAt: new Date().toISOString().split("T")[0],
  weightKg: "",
  waistCm: "",
  bodyFatPct: "",
  systolic: "",
  diastolic: "",
  notes: "",
};

function formFromEntry(
  entry: ProgressEntry | undefined,
  today: string,
): typeof defaultForm {
  if (!entry) return { ...defaultForm, recordedAt: today };
  return {
    recordedAt: today,
    weightKg: entry.weightKg !== null ? String(entry.weightKg) : "",
    waistCm: entry.waistCm !== null ? String(entry.waistCm) : "",
    bodyFatPct: entry.bodyFatPct !== null ? String(entry.bodyFatPct) : "",
    systolic:
      entry.bloodPressureSystolic !== null
        ? String(entry.bloodPressureSystolic)
        : "",
    diastolic:
      entry.bloodPressureDiastolic !== null
        ? String(entry.bloodPressureDiastolic)
        : "",
    notes: "",
  };
}

export default function ProgressoPage() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const loadData = async () => {
    const [entriesRes, statsRes] = await Promise.all([
      api.get("/progress/entries").catch(() => ({ data: [] })),
      api.get("/progress/stats").catch(() => ({ data: null })),
    ]);
    setEntries(entriesRes.data);
    setStats(statsRes.data);
    setLoading(false);
    return entriesRes.data as ProgressEntry[];
  };

  useEffect(() => {
    loadData();
  }, []);

  const set =
    (field: keyof typeof defaultForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weightKg && !form.waistCm && !form.bodyFatPct && !form.systolic) {
      setFormError("Informe ao menos uma medida.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/progress/entries", {
        recordedAt: form.recordedAt,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        waistCm: form.waistCm ? parseFloat(form.waistCm) : undefined,
        bodyFatPct: form.bodyFatPct ? parseFloat(form.bodyFatPct) : undefined,
        bloodPressureSystolic: form.systolic
          ? parseInt(form.systolic)
          : undefined,
        bloodPressureDiastolic: form.diastolic
          ? parseInt(form.diastolic)
          : undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      const updated = await loadData();
      // pré-preencher com a entrada mais recente para facilitar próxima medição
      setForm(formFromEntry(updated[0], today));
    } catch {
      setFormError("Erro ao salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/progress/entries/${id}`);
      await loadData();
    } catch {
      // silencioso
    } finally {
      setDeletingId(null);
    }
  };

  // Dados do gráfico (ordenados da mais antiga para a mais recente)
  const chartData = [...entries]
    .filter((e) => e.weightKg !== null)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    .map((e) => ({
      date: new Date(e.recordedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      peso: e.weightKg,
    }));

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha Evolução</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Acompanhe seu progresso ao longo do tratamento
          </p>
        </div>
        <button
          onClick={() => {
            if (!showForm) setForm(formFromEntry(entries[0], today));
            setShowForm((p) => !p);
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova medição
        </button>
      </div>

      {/* Formulário de nova medição */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-800">
              Registrar nova medição
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {entries.length > 0 && (
            <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Campos pré-preenchidos com sua última medição — altere apenas o
              que mudou.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Data da medição
              </label>
              <input
                type="date"
                value={form.recordedAt}
                onChange={set("recordedAt")}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="500"
                placeholder="Ex: 82.5"
                value={form.weightKg}
                onChange={set("weightKg")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Cintura (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="40"
                max="300"
                placeholder="Ex: 95"
                value={form.waistCm}
                onChange={set("waistCm")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                % Gordura corporal
              </label>
              <input
                type="number"
                step="0.1"
                min="3"
                max="80"
                placeholder="Ex: 32.5"
                value={form.bodyFatPct}
                onChange={set("bodyFatPct")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Pressão sistólica
              </label>
              <input
                type="number"
                min="60"
                max="250"
                placeholder="Ex: 120"
                value={form.systolic}
                onChange={set("systolic")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Pressão diastólica
              </label>
              <input
                type="number"
                min="40"
                max="150"
                placeholder="Ex: 80"
                value={form.diastolic}
                onChange={set("diastolic")}
                className={inputClass}
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Observações (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: pesado em jejum, após atividade física..."
                value={form.notes}
                onChange={set("notes")}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar medição"}
            </button>
          </div>
        </form>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Peso atual
              </span>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Scale className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.currentWeight !== null &&
              stats?.currentWeight !== undefined
                ? `${stats.currentWeight}`
                : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">kg</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Perdeu
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.totalLost !== null && stats?.totalLost !== undefined
                ? `${stats.totalLost}`
                : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              kg{" "}
              {stats?.weeklyAvgLoss !== null &&
              stats?.weeklyAvgLoss !== undefined &&
              stats?.weeklyAvgLoss > 0
                ? `· ${stats.weeklyAvgLoss} kg/sem`
                : ""}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                IMC
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p
              className={`text-3xl font-bold ${bmiColor(stats?.currentBMI ?? null)}`}
            >
              {stats?.currentBMI !== null && stats?.currentBMI !== undefined
                ? stats.currentBMI
                : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {bmiLabel(stats?.currentBMI ?? null)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Meta
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.progressPct !== null && stats?.progressPct !== undefined
                ? `${stats.progressPct}%`
                : "—"}
            </p>
            {stats?.progressPct !== null &&
              stats?.progressPct !== undefined && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, stats.progressPct)}%` }}
                  />
                </div>
              )}
            <p className="text-xs text-gray-400 mt-1">da meta (10%)</p>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {!loading && chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Evolução do peso
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                unit=" kg"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${value} kg`, "Peso"]}
              />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={{ fill: "#16a34a", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">
            Histórico de medições
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Carregando...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">
              Nenhuma medição registrada ainda.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-green-600 text-sm font-medium hover:underline"
            >
              Registrar primeira medição
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div key={entry.id} className="px-6 py-4">
                  <div
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="min-w-[90px]">
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(entry.recordedAt).toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 flex-1">
                      {entry.weightKg !== null && (
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">
                            {entry.weightKg} kg
                          </span>
                        </span>
                      )}
                      {entry.waistCm !== null && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                          Cintura: {entry.waistCm} cm
                        </span>
                      )}
                      {entry.bodyFatPct !== null && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                          Gordura: {entry.bodyFatPct}%
                        </span>
                      )}
                      {entry.bloodPressureSystolic !== null && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                          Pressão: {entry.bloodPressureSystolic}/
                          {entry.bloodPressureDiastolic ?? "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-300" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pl-[106px] space-y-2">
                      {entry.notes && (
                        <p className="text-sm text-gray-500 italic">
                          "{entry.notes}"
                        </p>
                      )}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === entry.id ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
