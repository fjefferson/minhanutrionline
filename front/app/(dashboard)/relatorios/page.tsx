"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Scale, Syringe, Activity } from "lucide-react";

/* ── Tipos ── */
interface ProgressEntry {
  id: string;
  recordedAt: string;
  weightKg: number | null;
}

interface Stats {
  totalLost: number | null;
  currentWeight: number | null;
  currentBMI: number | null;
  progressPct: number | null;
  weeklyAvgLoss: number | null;
  totalEntries: number;
}

interface Glp1DosageLog {
  id: string;
  medication: string;
  startDate: string;
  endDate: string | null;
}

interface SymptomReport {
  id: string;
  createdAt: string;
  symptoms: { symptom: { name: string; slug: string } }[];
}

type Tab = "peso" | "doses" | "sintomas";

/* ── Helpers ── */
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

export default function RelatoriosPage() {
  const [tab, setTab] = useState<Tab>("peso");

  // Peso
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingPeso, setLoadingPeso] = useState(true);

  // Doses
  const [dosageLogs, setDosageLogs] = useState<Glp1DosageLog[]>([]);
  const [loadingDoses, setLoadingDoses] = useState(true);

  // Sintomas
  const [symptomReports, setSymptomReports] = useState<SymptomReport[]>([]);
  const [loadingSintomas, setLoadingSintomas] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/progress/entries").catch(() => ({ data: [] })),
      api.get("/progress/stats").catch(() => ({ data: null })),
    ]).then(([e, s]) => {
      setEntries(e.data);
      setStats(s.data);
      setLoadingPeso(false);
    });

    api
      .get("/glp1/dosage-history")
      .catch(() => ({ data: [] }))
      .then((r) => {
        setDosageLogs(r.data);
        setLoadingDoses(false);
      });

    api
      .get("/glp1/reports")
      .catch(() => ({ data: [] }))
      .then((r) => {
        setSymptomReports(r.data);
        setLoadingSintomas(false);
      });
  }, []);

  /* Gráfico de peso */
  const weightChartData = [...entries]
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
      ts: new Date(e.recordedAt).getTime(),
    }));

  /* Gráfico peso + marcadores de dose */
  const dosageRefLines = dosageLogs.map((log) => {
    const ts = new Date(log.startDate).getTime();
    // Encontrar o ponto do gráfico mais próximo
    const closest = weightChartData.reduce(
      (best, point) => {
        const diff = Math.abs(point.ts - ts);
        return diff < best.diff ? { label: point.date, diff } : best;
      },
      { label: "", diff: Infinity },
    );
    return { date: closest.label, medication: log.medication, ts };
  });

  /* Gráfico de frequência de sintomas */
  const symptomFreq: Record<string, number> = {};
  symptomReports.forEach((r) =>
    r.symptoms.forEach((s) => {
      const name = s.symptom.name;
      symptomFreq[name] = (symptomFreq[name] ?? 0) + 1;
    }),
  );
  const symptomChartData = Object.entries(symptomFreq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const tabClass = (t: Tab) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
      tab === t
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Relatórios</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Visualize sua evolução e histórico de tratamento
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("peso")} className={tabClass("peso")}>
          <Scale className="w-4 h-4" />
          Evolução de Peso
        </button>
        <button onClick={() => setTab("doses")} className={tabClass("doses")}>
          <Syringe className="w-4 h-4" />
          Doses GLP-1
        </button>
        <button
          onClick={() => setTab("sintomas")}
          className={tabClass("sintomas")}
        >
          <Activity className="w-4 h-4" />
          Sintomas
        </button>
      </div>

      {/* ── ABA PESO ── */}
      {tab === "peso" && (
        <div className="space-y-5">
          {loadingPeso ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              Carregando...
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">
                    Peso atual
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.currentWeight ?? "—"}
                    <span className="text-sm font-normal text-gray-400 ml-1">
                      kg
                    </span>
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">
                    Perdeu
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {stats?.totalLost !== null && stats?.totalLost !== undefined
                      ? stats.totalLost
                      : "—"}
                    <span className="text-sm font-normal text-gray-400 ml-1">
                      kg
                    </span>
                  </p>
                  {stats?.weeklyAvgLoss !== null &&
                    stats?.weeklyAvgLoss !== undefined &&
                    stats?.weeklyAvgLoss > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {stats.weeklyAvgLoss} kg/semana
                      </p>
                    )}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">
                    IMC
                  </p>
                  <p
                    className={`text-2xl font-bold ${bmiColor(stats?.currentBMI ?? null)}`}
                  >
                    {stats?.currentBMI ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {bmiLabel(stats?.currentBMI ?? null)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">
                    Meta (10%)
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats?.progressPct !== null &&
                    stats?.progressPct !== undefined
                      ? `${stats.progressPct}%`
                      : "—"}
                  </p>
                  {stats?.progressPct !== null &&
                    stats?.progressPct !== undefined && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${Math.min(100, stats.progressPct)}%`,
                          }}
                        />
                      </div>
                    )}
                </div>
              </div>

              {/* Gráfico */}
              {weightChartData.length > 1 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">
                    Evolução do peso ao longo do tempo
                  </h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={weightChartData}
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
                        formatter={(v) => [`${v} kg`, "Peso"]}
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
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
                  Registre ao menos 2 medições de peso para visualizar o
                  gráfico.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA DOSES ── */}
      {tab === "doses" && (
        <div className="space-y-5">
          {loadingDoses || loadingPeso ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              Carregando...
            </div>
          ) : (
            <>
              {weightChartData.length > 1 && dosageLogs.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-700 mb-1">
                    Peso com marcadores de mudança de dose
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">
                    As linhas verticais indicam quando uma nova dose foi
                    iniciada
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={weightChartData}
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
                        formatter={(v) => [`${v} kg`, "Peso"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={{ fill: "#16a34a", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {dosageRefLines.map(
                        (ref, i) =>
                          ref.date && (
                            <ReferenceLine
                              key={i}
                              x={ref.date}
                              stroke="#6366f1"
                              strokeDasharray="4 3"
                              label={{
                                value: ref.medication.split(" ")[0],
                                position: "top",
                                fontSize: 10,
                                fill: "#6366f1",
                              }}
                            />
                          ),
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
                  {dosageLogs.length === 0
                    ? "Nenhuma dose registrada. Acesse a aba GLP-1 para registrar."
                    : "Registre ao menos 2 medições de peso para visualizar o gráfico combinado."}
                </div>
              )}

              {/* Timeline de doses */}
              {dosageLogs.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">
                    Histórico de doses
                  </h2>
                  <div className="space-y-3">
                    {dosageLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            log.endDate === null
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800">
                            {log.medication}
                          </span>
                          {log.endDate === null && (
                            <span className="ml-2 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
                              atual
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 shrink-0">
                          {new Date(log.startDate).toLocaleDateString("pt-BR")}
                          {log.endDate && (
                            <>
                              {" "}
                              →{" "}
                              {new Date(log.endDate).toLocaleDateString(
                                "pt-BR",
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA SINTOMAS ── */}
      {tab === "sintomas" && (
        <div className="space-y-5">
          {loadingSintomas ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              Carregando...
            </div>
          ) : symptomReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              Nenhuma orientação registrada. Acesse a aba GLP-1 para começar.
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">
                  Sintomas mais frequentes
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Baseado em {symptomReports.length} orientação
                  {symptomReports.length !== 1 ? "ões" : ""} registrada
                  {symptomReports.length !== 1 ? "s" : ""}
                </p>
                {symptomChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={symptomChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f3f4f6"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          fontSize: "12px",
                        }}
                        formatter={(v) => [
                          `${v} vez${v !== 1 ? "es" : ""}`,
                          "Frequência",
                        ]}
                      />
                      <Bar
                        dataKey="count"
                        fill="#16a34a"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">
                    Sem dados suficientes.
                  </p>
                )}
              </div>

              {/* Evolução temporal de sintomas */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Número de sintomas por orientação
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={[...symptomReports]
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() -
                          new Date(b.createdAt).getTime(),
                      )
                      .map((r, i) => ({
                        idx: i + 1,
                        sintomas: r.symptoms.length,
                      }))}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="idx"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "orientação nº",
                        position: "insideBottom",
                        offset: -2,
                        fontSize: 10,
                        fill: "#9ca3af",
                      }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [`${v} sintoma(s)`, ""]}
                    />
                    <Line
                      type="monotone"
                      dataKey="sintomas"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: "#f59e0b", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
