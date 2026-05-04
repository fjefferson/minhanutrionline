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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* CALENDAR */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              disabled={
                calYear === TODAY.getFullYear() && calMonth === TODAY.getMonth()
              }
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-gray-900 text-sm">
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
                className="text-center text-xs font-medium text-gray-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = calDateStr(day);
              const isBlocked = blockedDates.has(dateStr);
              const disabled =
                !isBizDay(day) ||
                isBeforeToday(day) ||
                isBeforeEarliestDate(day) ||
                isBlocked;
              const isBooked = bookedDates.has(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  disabled={disabled || isBooked}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`
                    aspect-square text-sm rounded-lg font-medium transition-all
                    ${isSelected ? "bg-green-600 text-white" : ""}
                    ${isBooked && !isSelected ? "bg-green-100 text-green-700 cursor-default" : ""}
                    ${isBlocked && !isSelected ? "bg-red-50 text-red-300 cursor-not-allowed" : ""}
                    ${
                      !disabled && !isBooked && !isSelected
                        ? "hover:bg-green-50 text-gray-800"
                        : ""
                    }
                    ${disabled && !isBlocked ? "text-gray-300 cursor-not-allowed" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 inline-block" /> Já
              agendado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" />{" "}
              Bloqueado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-600 inline-block" />{" "}
              Selecionado
            </span>
          </div>
        </div>

        {/* SLOT PICKER */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-8">
              <CalendarDays size={36} className="mb-3 opacity-40" />
              <p className="text-sm">
                Selecione um dia no calendário para ver os horários disponíveis
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="font-semibold text-gray-900">
                  {new Date(selectedDate + "T12:00:00Z").toLocaleDateString(
                    "pt-BR",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    },
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Horário de Brasília — selecione um horário
                </p>
              </div>

              {slotsLoading ? (
                <p className="text-sm text-gray-400">Carregando horários...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum horário disponível para este dia.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {slots.map((h) => (
                    <button
                      key={h}
                      onClick={() =>
                        setBookingHour(bookingHour === h ? null : h)
                      }
                      className={`py-2 rounded-lg text-sm font-medium border transition-all
                        ${
                          bookingHour === h
                            ? "bg-green-600 text-white border-green-600"
                            : "border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700"
                        }`}
                    >
                      <Clock size={12} className="inline mr-1 -mt-0.5" />
                      {String(h).padStart(2, "0")}:00
                    </button>
                  ))}
                </div>
              )}

              {bookError && (
                <p className="text-sm text-red-600 mb-3">{bookError}</p>
              )}

              <button
                onClick={handleBook}
                disabled={bookingHour === null || booking}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {booking ? "Agendando..." : "Solicitar agendamento"}
              </button>
            </>
          )}
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
                    onClick={() => setCancelConfirm(c.id)}
                    disabled={cancelling && cancelConfirm === c.id}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    <X size={14} /> Cancelar
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0 text-right">
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

      {!loading && consultations.length === 0 && (
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
