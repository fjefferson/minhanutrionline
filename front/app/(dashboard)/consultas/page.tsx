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
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface Consultation {
  id: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  meetingLink?: string;
  notes?: string;
  cancelReason?: string;
}

interface Eligibility {
  canBook: boolean;
  earliestDate: string;
  reason: string;
}

interface PublicConfig {
  bizHours: number[];
  bizDays: number[];
  cancelDays: number;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando confirmação",
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
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatBrazilDate(isoUtc: string): string {
  // scheduledAt is stored as UTC but represents the local Brazil booking time
  const d = new Date(isoUtc);
  const hour = d.getUTCHours() - 3; // UTC-3 = Brazil
  const date = new Date(d.getTime() - 3 * 3600_000);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy} às ${String(hour).padStart(2, "0")}:00`;
}

function isoToBrazilDateStr(isoUtc: string): string {
  const d = new Date(new Date(isoUtc).getTime() - 3 * 3600_000);
  return d.toISOString().slice(0, 10);
}

const TODAY = new Date();

export default function ConsultasPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicConfig, setPublicConfig] = useState<PublicConfig>({
    bizHours: [8, 9, 10, 11, 14, 15, 16, 17],
    bizDays: [1, 2, 3, 4, 5],
    cancelDays: 5,
  });
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  // Calendar state
  const [calYear, setCalYear] = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<number[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingHour, setBookingHour] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Cancel confirm dialog
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null); // consultation id
  const [cancelling, setCancelling] = useState(false);

  // Profile completeness warning
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([
        api.get<Consultation[]>("/consultations"),
        api.get<Eligibility>("/consultations/eligibility"),
      ]);
      setConsultations(c.data);
      setEligibility(e.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api
      .get<PublicConfig>("/consultations/config")
      .then((r) => setPublicConfig(r.data))
      .catch(() => {});
    api
      .get("/profile/nutritional")
      .then((r) => {
        const p = r.data;
        if (!p || !p.gender || !p.heightCm || !p.weightKg || !p.goal) {
          setProfileIncomplete(true);
        }
      })
      .catch(() => {});
  }, [load]);

  // Fetch blocked dates whenever month changes — and poll every 30s for reactivity
  useEffect(() => {
    const month = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;

    function fetchBlocked() {
      api
        .get<{ dates: string[] }>(`/consultations/blocked-dates?month=${month}`)
        .then((r) => setBlockedDates(new Set(r.data.dates)))
        .catch(() => setBlockedDates(new Set()));
    }

    fetchBlocked();
    const interval = setInterval(fetchBlocked, 10_000);
    return () => clearInterval(interval);
  }, [calYear, calMonth]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSlots([]);
    setBookingHour(null);
    setBookError(null);
    api
      .get<{ slots: number[] }>(
        `/consultations/available-slots?date=${selectedDate}`,
      )
      .then((r) => setSlots(r.data.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate]);

  // Calendar helpers
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  function calDateStr(day: number): string {
    return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function isBizDay(day: number): boolean {
    const dow = new Date(calYear, calMonth, day).getDay();
    return publicConfig.bizDays.includes(dow);
  }

  function isBeforeEarliestDate(day: number): boolean {
    if (!eligibility) return true;
    return calDateStr(day) < eligibility.earliestDate;
  }

  function isBeforeToday(day: number): boolean {
    const todayStr = TODAY.toLocaleDateString("en-CA");
    return calDateStr(day) < todayStr;
  }

  // Dates that already have a booking (non-cancelled)
  const bookedDates = new Set(
    consultations
      .filter((c) => c.status !== "CANCELLED")
      .map((c) => isoToBrazilDateStr(c.scheduledAt)),
  );

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
    setSelectedDate(null);
  };

  async function handleBook() {
    if (!selectedDate || bookingHour === null) return;
    setBooking(true);
    setBookError(null);
    try {
      await api.post("/consultations", {
        date: selectedDate,
        hour: bookingHour,
      });
      toast.success("Consulta agendada com sucesso!");
      setSelectedDate(null);
      setBookingHour(null);
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao agendar";
      setBookError(msg);
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  }

  async function handleCancelConfirmed() {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      await api.delete(`/consultations/${cancelConfirm}`);
      toast.success("Consulta cancelada.");
      await load();
    } catch {
      toast.error("Erro ao cancelar consulta. Tente novamente.");
    } finally {
      setCancelling(false);
      setCancelConfirm(null);
    }
  }

  const upcoming = consultations.filter(
    (c) =>
      c.status !== "CANCELLED" &&
      c.status !== "COMPLETED" &&
      new Date(c.scheduledAt) > new Date(),
  );
  const past = consultations.filter(
    (c) =>
      c.status === "COMPLETED" ||
      c.status === "CANCELLED" ||
      new Date(c.scheduledAt) <= new Date(),
  );

  const todayStr = TODAY.toLocaleDateString("en-CA");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ConfirmDialog
        open={!!cancelConfirm}
        title="Cancelar consulta?"
        description="Esta ação não pode ser desfeita. Sua consulta será cancelada."
        confirmLabel="Sim, cancelar"
        variant="danger"
        loading={cancelling}
        onConfirm={handleCancelConfirmed}
        onCancel={() => setCancelConfirm(null)}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultas Online</h1>
        <p className="text-gray-500 text-sm mt-1">
          Agende sua consulta com a nutricionista
        </p>
      </div>

      {profileIncomplete && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-amber-800">
              Seu perfil nutricional está incompleto
            </p>
            <p className="text-amber-700 mt-0.5">
              Preencha seu perfil antes de agendar —{" "}
              <a
                href="/perfil"
                className="underline font-medium hover:text-amber-900"
              >
                completar agora
              </a>
              . Isso é essencial para a nutricionista preparar seu atendimento.
            </p>
          </div>
        </div>
      )}

      {/* Eligibility banner — shown when user cannot book yet */}
      {eligibility && !eligibility.canBook && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
          <CalendarDays size={20} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-blue-900">
              Agendamento ainda não disponível
            </p>
            <p className="text-blue-700 mt-1">{eligibility.reason}</p>
            <p className="text-blue-600 text-xs mt-1">
              Disponível a partir de{" "}
              <strong>
                {new Date(
                  eligibility.earliestDate + "T12:00:00Z",
                ).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* ── BOOKING SECTION ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${!selectedDate ? "text-green-700" : "text-gray-400"}`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${!selectedDate ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              1
            </span>
            Escolher data
          </div>
          <ChevronRight size={13} className="text-gray-300" />
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${selectedDate && bookingHour === null ? "text-green-700" : "text-gray-400"}`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedDate && bookingHour === null ? "bg-green-600 text-white" : selectedDate ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-300"}`}
            >
              2
            </span>
            Escolher horário
          </div>
          <ChevronRight size={13} className="text-gray-300" />
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${bookingHour !== null ? "text-green-700" : "text-gray-400"}`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${bookingHour !== null ? "bg-green-600 text-white" : "bg-gray-100 text-gray-300"}`}
            >
              3
            </span>
            Confirmar
          </div>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* ── CALENDAR ── hidden on mobile when a date is selected */}
          <div className={`p-5 ${selectedDate ? "hidden md:block" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                disabled={
                  calYear === TODAY.getFullYear() &&
                  calMonth === TODAY.getMonth()
                }
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-gray-900 text-sm select-none">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 mb-1">
              {DOW_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-gray-400 py-1 select-none"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const dateStr = calDateStr(day);
                  const isToday = dateStr === todayStr;
                  const isBlocked = blockedDates.has(dateStr);
                  const isBooked = bookedDates.has(dateStr);
                  const isSelected = selectedDate === dateStr;
                  const disabled =
                    !isBizDay(day) ||
                    isBeforeToday(day) ||
                    isBeforeEarliestDate(day) ||
                    isBlocked;
                  const available = !disabled && !isBooked;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled || isBooked}
                      onClick={() =>
                        setSelectedDate(isSelected ? null : dateStr)
                      }
                      title={
                        isBooked
                          ? "Já agendado"
                          : isBlocked
                            ? "Data bloqueada"
                            : disabled
                              ? "Indisponível"
                              : undefined
                      }
                      className={[
                        "relative h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all select-none",
                        isSelected
                          ? "bg-green-600 text-white shadow-sm"
                          : isBooked
                            ? "bg-green-100 text-green-700 cursor-default"
                            : isBlocked
                              ? "bg-red-50 text-red-300 cursor-not-allowed"
                              : available
                                ? "text-gray-800 hover:bg-green-50 hover:text-green-700 cursor-pointer"
                                : "text-gray-300 cursor-not-allowed",
                        isToday && !isSelected
                          ? "ring-2 ring-green-400 ring-offset-1"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {day}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                      )}
                    </button>
                  );
                },
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 border-t border-gray-50 pt-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-green-50 ring-2 ring-green-400 inline-block" />
                Hoje
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-green-600 inline-block" />
                Selecionado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-green-100 inline-block" />
                Já agendado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-red-50 border border-red-200 inline-block" />
                Bloqueado
              </span>
            </div>
          </div>

          {/* ── SLOT PICKER ── hidden on mobile when no date selected */}
          <div className={`p-5 ${!selectedDate ? "hidden md:block" : ""}`}>
            {!selectedDate ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10 min-h-[300px]">
                <CalendarDays
                  size={40}
                  className="mb-3 opacity-25 text-green-500"
                />
                <p className="text-sm font-medium text-gray-500">
                  Nenhuma data selecionada
                </p>
                <p className="text-xs mt-1 text-gray-400">
                  Clique em um dia disponível no calendário ao lado
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Selected date header */}
                <div className="flex items-center gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(null);
                      setBookingHour(null);
                    }}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-400 shrink-0 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize text-sm leading-tight">
                      {new Date(selectedDate + "T12:00:00Z").toLocaleDateString(
                        "pt-BR",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        },
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Horário de Brasília (UTC-3)
                    </p>
                  </div>
                </div>

                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-11 rounded-xl bg-gray-100 animate-pulse"
                      />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 text-gray-400">
                    <Clock size={28} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      Sem horários disponíveis
                    </p>
                    <p className="text-xs mt-1">Tente selecionar outra data</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() =>
                          setBookingHour(bookingHour === h ? null : h)
                        }
                        className={[
                          "h-11 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1",
                          bookingHour === h
                            ? "bg-green-600 text-white border-green-600 shadow-sm"
                            : "border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50 hover:text-green-700",
                        ].join(" ")}
                      >
                        <Clock size={12} className="-mt-px shrink-0" />
                        {String(h).padStart(2, "0")}:00
                      </button>
                    ))}
                  </div>
                )}

                {/* Summary card */}
                {bookingHour !== null && (
                  <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs text-green-700 font-semibold mb-1 uppercase tracking-wide">
                      Resumo
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(selectedDate + "T12:00:00Z").toLocaleDateString(
                        "pt-BR",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        },
                      )}{" "}
                      às {String(bookingHour).padStart(2, "0")}:00
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Consulta com a nutricionista · Online
                    </p>
                  </div>
                )}

                {bookError && (
                  <p className="text-sm text-red-600 mt-3">{bookError}</p>
                )}

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={bookingHour === null || booking}
                  className="mt-4 w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                >
                  {booking ? "Agendando..." : "Solicitar agendamento"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Próximas consultas
          </h2>
          <div className="space-y-3">
            {upcoming.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays
                      size={15}
                      className="text-green-600 shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-900">
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
                      className="flex items-center gap-1.5 text-sm text-green-700 hover:underline"
                    >
                      <Video size={13} /> Entrar na reunião
                    </a>
                  )}
                  {c.notes && (
                    <p className="text-xs text-gray-500">{c.notes}</p>
                  )}
                </div>
                {new Date(c.scheduledAt).getTime() - Date.now() >
                publicConfig.cancelDays * 86_400_000 ? (
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(c.id)}
                    disabled={cancelling && cancelConfirm === c.id}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0 flex items-center gap-1 disabled:opacity-50 transition"
                  >
                    <X size={14} /> Cancelar
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0 text-right leading-relaxed">
                    Cancelamento
                    <br />
                    indisponível
                    <br />
                    (&lt;{publicConfig.cancelDays}d)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAST */}
      {!loading && past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Histórico
          </h2>
          <div className="space-y-2">
            {past.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4 opacity-80"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays
                      size={14}
                      className="text-gray-400 shrink-0"
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
                  {c.cancelReason && (
                    <p className="text-xs text-gray-400">{c.cancelReason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && consultations.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            Você ainda não tem nenhuma consulta agendada
          </p>
        </div>
      )}
    </div>
  );
}
