"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CalendarDays,
  Clock,
  Video,
  X,
  ChevronDown,
  Search,
  Link as LinkIcon,
  FileText,
  RotateCcw,
  Ban,
  Trash2,
  Lock,
  Settings,
} from "lucide-react";

interface ConsultationUser {
  id: string;
  name: string;
  email: string;
}

interface Consultation {
  id: string;
  userId: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  meetingLink?: string;
  notes?: string;
  cancelReason?: string;
  user: ConsultationUser;
}

interface AgendaBlock {
  id: string;
  blockedAt: string;
  allDay: boolean;
  reason?: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatBrazilDate(isoUtc: string): string {
  const d = new Date(isoUtc);
  const bz = new Date(d.getTime() - 3 * 3600_000);
  const dd = String(bz.getUTCDate()).padStart(2, "0");
  const mm = String(bz.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = bz.getUTCFullYear();
  const hh = String(bz.getUTCHours()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:00`;
}

function toBrazilDateStr(isoUtc: string): string {
  const bz = new Date(new Date(isoUtc).getTime() - 3 * 3600_000);
  return bz.toISOString().slice(0, 10);
}

function formatBlockLabel(block: AgendaBlock): string {
  const d = new Date(block.blockedAt);
  // allDay blocks are stored as UTC midnight of the Brazil date — read directly
  // hour blocks are stored in UTC and need -3h to get the Brazil hour
  const bz = block.allDay ? d : new Date(d.getTime() - 3 * 3600_000);
  const dd = String(bz.getUTCDate()).padStart(2, "0");
  const mm = String(bz.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = bz.getUTCFullYear();
  if (block.allDay) return `${dd}/${mm}/${yyyy} — Dia inteiro`;
  return `${dd}/${mm}/${yyyy} ${String(bz.getUTCHours()).padStart(2, "0")}:00`;
}

interface ConsultationConfig {
  graceDays: number;
  gapDays: number;
  cancelDays: number;
  bizHours: number[];
  bizDays: number[];
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const ALL_DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export default function AdminConsultasPage() {
  const [tab, setTab] = useState<"consultations" | "blocks" | "config">(
    "consultations",
  );

  // ── Config ──
  const [config, setConfig] = useState<ConsultationConfig>({
    graceDays: 15,
    gapDays: 30,
    cancelDays: 5,
    bizHours: [8, 9, 10, 11, 14, 15, 16, 17],
    bizDays: [1, 2, 3, 4, 5],
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configForm, setConfigForm] = useState<ConsultationConfig>({
    graceDays: 15,
    gapDays: 30,
    cancelDays: 5,
    bizHours: [8, 9, 10, 11, 14, 15, 16, 17],
    bizDays: [1, 2, 3, 4, 5],
  });

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get<ConsultationConfig>(
        "/admin/consultation-config",
      );
      setConfig(res.data);
      setConfigForm(res.data);
    } catch {
      /* silently fail */
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadConfig();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadConfig]);

  async function handleSaveConfig() {
    setConfigSaving(true);
    try {
      const res = await api.put<ConsultationConfig>(
        "/admin/consultation-config",
        configForm,
      );
      setConfig(res.data);
      setConfigForm(res.data);
      toast.success("Configurações salvas com sucesso!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao salvar";
      toast.error(msg);
    } finally {
      setConfigSaving(false);
    }
  }

  function toggleConfigHour(h: number) {
    setConfigForm((f) => ({
      ...f,
      bizHours: f.bizHours.includes(h)
        ? f.bizHours.filter((x) => x !== h)
        : [...f.bizHours, h].sort((a, b) => a - b),
    }));
  }

  function toggleConfigDay(d: number) {
    setConfigForm((f) => ({
      ...f,
      bizDays: f.bizDays.includes(d)
        ? f.bizDays.filter((x) => x !== d)
        : [...f.bizDays, d].sort((a, b) => a - b),
    }));
  }

  // ── Consultations ──
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    meetingLink: "",
    notes: "",
    status: "",
    cancelReason: "",
    rescheduleDate: "",
    rescheduleHour: -1,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reschedule calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get<Consultation[]>(
        `/admin/consultations?${params}`,
      );
      setConsultations(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  function openEdit(c: Consultation) {
    setEditId(c.id);
    setForm({
      meetingLink: c.meetingLink ?? "",
      notes: c.notes ?? "",
      status: c.status,
      cancelReason: c.cancelReason ?? "",
      rescheduleDate: toBrazilDateStr(c.scheduledAt),
      rescheduleHour: new Date(
        new Date(c.scheduledAt).getTime() - 3 * 3600_000,
      ).getUTCHours(),
    });
    setSaveError(null);
    const bz = new Date(new Date(c.scheduledAt).getTime() - 3 * 3600_000);
    setCalYear(bz.getUTCFullYear());
    setCalMonth(bz.getUTCMonth());
  }

  async function handleSave() {
    if (!editId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {
        meetingLink: form.meetingLink || null,
        notes: form.notes || null,
        status: form.status,
        cancelReason: form.cancelReason || null,
      };
      if (form.rescheduleDate && form.rescheduleHour >= 0) {
        body.date = form.rescheduleDate;
        body.hour = form.rescheduleHour;
      }
      await api.put(`/admin/consultations/${editId}`, body);
      toast.success("Consulta atualizada!");
      await load();
      setEditId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao salvar";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const filtered = consultations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.user.name.toLowerCase().includes(q) ||
      c.user.email.toLowerCase().includes(q)
    );
  });

  // Calendar helpers (shared for reschedule modal and block calendar)
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  function calDateStr(day: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function isWeekend(day: number) {
    const dow = new Date(calYear, calMonth, day).getDay();
    return dow === 0 || dow === 6;
  }

  // ── Agenda Blocks ──
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [blockCalYear, setBlockCalYear] = useState(today.getFullYear());
  const [blockCalMonth, setBlockCalMonth] = useState(today.getMonth());
  const [blockDate, setBlockDate] = useState<string>("");
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockHour, setBlockHour] = useState<number>(-1);
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // ConfirmDialog state for delete block
  const [deleteBlockConfirm, setDeleteBlockConfirm] = useState<string | null>(
    null,
  );
  const [deletingBlock, setDeletingBlock] = useState(false);

  const blockFirstDay = new Date(blockCalYear, blockCalMonth, 1).getDay();
  const blockDaysInMonth = new Date(
    blockCalYear,
    blockCalMonth + 1,
    0,
  ).getDate();
  function blockDateStr(day: number) {
    return `${blockCalYear}-${String(blockCalMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function blockIsWeekend(day: number) {
    return [0, 6].includes(new Date(blockCalYear, blockCalMonth, day).getDay());
  }

  const loadBlocks = useCallback(async () => {
    setLoadingBlocks(true);
    try {
      const res = await api.get<AgendaBlock[]>("/admin/agenda-blocks");
      setBlocks(res.data);
    } catch {
      // silently fail
    } finally {
      setLoadingBlocks(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "blocks") return;
    const timeout = setTimeout(() => {
      void loadBlocks();
    }, 0);
    return () => clearTimeout(timeout);
  }, [tab, loadBlocks]);

  async function handleCreateBlock() {
    if (!blockDate) {
      setBlockError("Selecione uma data");
      return;
    }
    if (!blockAllDay && blockHour < 0) {
      setBlockError("Selecione um horário ou marque 'Dia inteiro'");
      return;
    }
    setBlockSaving(true);
    setBlockError(null);
    try {
      await api.post("/admin/agenda-blocks", {
        date: blockDate,
        allDay: blockAllDay,
        hour: blockAllDay ? undefined : blockHour,
        reason: blockReason || undefined,
      });
      toast.success("Bloqueio criado com sucesso!");
      setBlockDate("");
      setBlockHour(-1);
      setBlockReason("");
      await loadBlocks();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao criar bloqueio";
      setBlockError(msg);
      toast.error(msg);
    } finally {
      setBlockSaving(false);
    }
  }

  async function handleDeleteBlockConfirmed() {
    if (!deleteBlockConfirm) return;
    setDeletingBlock(true);
    try {
      await api.delete(`/admin/agenda-blocks/${deleteBlockConfirm}`);
      setBlocks((b) => b.filter((bl) => bl.id !== deleteBlockConfirm));
      toast.success("Bloqueio removido.");
    } catch {
      toast.error("Erro ao remover bloqueio.");
    } finally {
      setDeletingBlock(false);
      setDeleteBlockConfirm(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ConfirmDialog
        open={!!deleteBlockConfirm}
        title="Remover bloqueio?"
        description="O bloqueio será removido e o horário/dia voltará a ficar disponível."
        confirmLabel="Sim, remover"
        variant="warning"
        loading={deletingBlock}
        onConfirm={handleDeleteBlockConfirmed}
        onCancel={() => setDeleteBlockConfirm(null)}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Gerenciar Consultas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Confirme, adicione links e gerencie as consultas das pacientes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("consultations")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "consultations"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CalendarDays size={14} className="inline mr-1.5 -mt-0.5" />
          Consultas
        </button>
        <button
          onClick={() => setTab("blocks")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "blocks"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Ban size={14} className="inline mr-1.5 -mt-0.5" />
          Bloqueios de Agenda
        </button>
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "config"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Settings size={14} className="inline mr-1.5 -mt-0.5" />
          Configurações
        </button>
      </div>

      {/* ── TAB: CONSULTATIONS ── */}
      {tab === "consultations" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none bg-white"
              >
                <option value="">Todos os status</option>
                <option value="PENDING">Aguardando</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="COMPLETED">Realizadas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma consulta encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">
                        {c.user.name}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {c.user.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CalendarDays
                        size={13}
                        className="text-green-600 shrink-0"
                      />
                      <span className="text-sm text-gray-700">
                        {formatBrazilDate(c.scheduledAt)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    {c.meetingLink && (
                      <a
                        href={c.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 flex items-center gap-1 hover:underline"
                      >
                        <Video size={11} /> Link da reunião
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(c)}
                    className="text-sm font-medium text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition shrink-0"
                  >
                    Gerenciar
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: BLOCKS ── */}
      {tab === "blocks" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create block form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <Lock size={15} className="text-red-500" /> Novo Bloqueio
            </h2>

            {blockError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {blockError}
              </div>
            )}

            {/* Block calendar */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => {
                  if (blockCalMonth === 0) {
                    setBlockCalYear((y) => y - 1);
                    setBlockCalMonth(11);
                  } else setBlockCalMonth((m) => m - 1);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                ←
              </button>
              <span className="text-xs font-semibold text-gray-700">
                {MONTH_NAMES[blockCalMonth]} {blockCalYear}
              </span>
              <button
                onClick={() => {
                  if (blockCalMonth === 11) {
                    setBlockCalYear((y) => y + 1);
                    setBlockCalMonth(0);
                  } else setBlockCalMonth((m) => m + 1);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DOW_LABELS.map((d) => (
                <div key={d} className="text-center text-xs text-gray-300">
                  {d[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-4">
              {Array.from({ length: blockFirstDay }).map((_, i) => (
                <div key={i} />
              ))}
              {Array.from({ length: blockDaysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const ds = blockDateStr(day);
                  const weekend = blockIsWeekend(day);
                  const selected = blockDate === ds;
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        !weekend && setBlockDate(selected ? "" : ds)
                      }
                      className={`aspect-square text-xs rounded-lg font-medium transition-all
                      ${selected ? "bg-red-500 text-white" : ""}
                      ${!weekend && !selected ? "hover:bg-red-50 text-gray-700" : ""}
                      ${weekend ? "text-gray-200 cursor-not-allowed" : ""}
                    `}
                    >
                      {day}
                    </button>
                  );
                },
              )}
            </div>

            {/* allDay toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={blockAllDay}
                onChange={(e) => {
                  setBlockAllDay(e.target.checked);
                  setBlockHour(-1);
                }}
                className="rounded border-gray-300 text-red-500 focus:ring-red-400"
              />
              Bloquear o dia inteiro
            </label>

            {/* Hour picker (only if not allDay) */}
            {!blockAllDay && blockDate && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5">
                  Horário (Brasília)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {config.bizHours.map((h) => (
                    <button
                      key={h}
                      onClick={() => setBlockHour(blockHour === h ? -1 : h)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border transition
                        ${
                          blockHour === h
                            ? "bg-red-500 text-white border-red-500"
                            : "border-gray-200 text-gray-600 hover:border-red-400"
                        }`}
                    >
                      <Clock size={10} className="inline mr-0.5 -mt-0.5" />
                      {String(h).padStart(2, "0")}:00
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />

            <button
              onClick={handleCreateBlock}
              disabled={blockSaving || !blockDate}
              className="w-full py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              <Ban size={14} />
              {blockSaving ? "Bloqueando..." : "Bloquear"}
            </button>
          </div>

          {/* Existing blocks list */}
          <div>
            <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <Ban size={15} className="text-gray-500" /> Bloqueios Ativos
            </h2>
            {loadingBlocks ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Carregando...
              </p>
            ) : blocks.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Ban size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum bloqueio cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        <Ban size={12} className="text-red-400 shrink-0" />
                        {formatBlockLabel(block)}
                      </p>
                      {block.reason && (
                        <p className="text-xs text-gray-400 mt-0.5 ml-4">
                          {block.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteBlockConfirm(block.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                      title="Remover bloqueio"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: CONFIG ── */}
      {tab === "config" && (
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings size={16} className="text-green-600" /> Configurações de
              Consultas
            </h2>

            {/* Grace period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carência após cadastro (dias)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Número de dias após o cadastro para a primeira consulta estar
                disponível
              </p>
              <input
                type="number"
                min={0}
                value={configForm.graceDays}
                onChange={(e) =>
                  setConfigForm((f) => ({
                    ...f,
                    graceDays: Number(e.target.value),
                  }))
                }
                className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Gap days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intervalo mínimo entre consultas (dias)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Intervalo mínimo entre a data de uma consulta e a próxima
              </p>
              <input
                type="number"
                min={0}
                value={configForm.gapDays}
                onChange={(e) =>
                  setConfigForm((f) => ({
                    ...f,
                    gapDays: Number(e.target.value),
                  }))
                }
                className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Cancel days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Antecedência mínima para cancelamento (dias)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Paciente não pode cancelar se a consulta estiver a menos de X
                dias
              </p>
              <input
                type="number"
                min={0}
                value={configForm.cancelDays}
                onChange={(e) =>
                  setConfigForm((f) => ({
                    ...f,
                    cancelDays: Number(e.target.value),
                  }))
                }
                className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Business hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horários disponíveis (horário Brasília)
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Marque os horários que a agenda aceita agendamentos
              </p>
              <div className="grid grid-cols-6 gap-2">
                {ALL_HOURS.map((h) => {
                  const active = configForm.bizHours.includes(h);
                  return (
                    <button
                      key={h}
                      onClick={() => toggleConfigHour(h)}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition text-center
                        ${
                          active
                            ? "bg-green-600 text-white border-green-600"
                            : "border-gray-200 text-gray-500 hover:border-green-400"
                        }`}
                    >
                      {String(h).padStart(2, "0")}:00
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Business days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dias disponíveis
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Dias da semana em que a agenda aceita agendamentos
              </p>
              <div className="flex gap-2">
                {ALL_DAYS.map(({ value, label }) => {
                  const active = configForm.bizDays.includes(value);
                  const isWeekend = value === 0 || value === 6;
                  return (
                    <button
                      key={value}
                      onClick={() => toggleConfigDay(value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition
                        ${
                          active
                            ? isWeekend
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-green-600 text-white border-green-600"
                            : "border-gray-200 text-gray-500 hover:border-green-400"
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={configSaving}
              className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-40 transition"
            >
              {configSaving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Gerenciar consulta
              </h2>
              <button
                onClick={() => setEditId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none bg-white"
                  >
                    <option value="PENDING">Aguardando confirmação</option>
                    <option value="CONFIRMED">Confirmada</option>
                    <option value="COMPLETED">Realizada</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Meeting link */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                  <LinkIcon size={11} /> Link da reunião
                </label>
                <input
                  value={form.meetingLink}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meetingLink: e.target.value }))
                  }
                  placeholder="https://meet.google.com/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                  <FileText size={11} /> Observações para a paciente
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Ex: Chegue 5 min antes, traga seus exames..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>

              {/* Cancel reason */}
              {form.status === "CANCELLED" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Motivo do cancelamento
                  </label>
                  <input
                    value={form.cancelReason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cancelReason: e.target.value }))
                    }
                    placeholder="Motivo..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              )}

              {/* Reschedule */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <RotateCcw size={11} /> Reagendar (opcional)
                </p>
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => {
                        if (calMonth === 0) {
                          setCalYear((y) => y - 1);
                          setCalMonth(11);
                        } else setCalMonth((m) => m - 1);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-xs"
                    >
                      ←
                    </button>
                    <span className="text-xs font-medium text-gray-700">
                      {MONTH_NAMES[calMonth]} {calYear}
                    </span>
                    <button
                      onClick={() => {
                        if (calMonth === 11) {
                          setCalYear((y) => y + 1);
                          setCalMonth(0);
                        } else setCalMonth((m) => m + 1);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-xs"
                    >
                      →
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {DOW_LABELS.map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs text-gray-300"
                      >
                        {d[0]}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={i} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => {
                        const ds = calDateStr(day);
                        const disabled = isWeekend(day);
                        const selected = form.rescheduleDate === ds;
                        return (
                          <button
                            key={day}
                            disabled={disabled}
                            onClick={() =>
                              setForm((f) => ({ ...f, rescheduleDate: ds }))
                            }
                            className={`aspect-square text-xs rounded font-medium transition-all
                            ${selected ? "bg-green-600 text-white" : ""}
                            ${!disabled && !selected ? "hover:bg-green-50 text-gray-700" : ""}
                            ${disabled ? "text-gray-200 cursor-not-allowed" : ""}
                          `}
                          >
                            {day}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {form.rescheduleDate && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1.5">
                        Horário (Brasília)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {config.bizHours.map((h) => (
                          <button
                            key={h}
                            onClick={() =>
                              setForm((f) => ({ ...f, rescheduleHour: h }))
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition
                              ${
                                form.rescheduleHour === h
                                  ? "bg-green-600 text-white border-green-600"
                                  : "border-gray-200 text-gray-600 hover:border-green-400"
                              }`}
                          >
                            <Clock
                              size={10}
                              className="inline mr-0.5 -mt-0.5"
                            />
                            {String(h).padStart(2, "0")}:00
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
