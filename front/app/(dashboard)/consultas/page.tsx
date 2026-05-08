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
  const [bookingSuccess, setBookingSuccess] = useState<{
    date: string;
    hour: number;
  } | null>(null);
  const [consultasLoadedAt] = useState(() => Date.now());

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
    const timeout = setTimeout(() => {
      void load();
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
    }, 0);

    // Poll consultations every 30s to reflect nutritionist changes (confirm, reschedule, cancel)
    const pollInterval = setInterval(() => load(), 30_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
    };
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
    const timeout = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(timeout);
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
      setBookingSuccess({ date: selectedDate, hour: bookingHour });
      setSelectedDate(null);
      setBookingHour(null);
      await load();
      toast.success("Consulta agendada com sucesso!");
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

  // Consultation lookup by date for calendar event blocks
  const consultationByDate = new Map<string, Consultation>();
  consultations.forEach((c) => {
    if (c.status !== "CANCELLED") {
      consultationByDate.set(isoToBrazilDateStr(c.scheduledAt), c);
    }
  });

  const EVENT_PILL: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-600",
    CANCELLED: "",
  };

  return (
    <div className="max-w-6xl px-4 pt-4 pb-8">
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

      {/* Alerts */}
      <div className="space-y-3 mb-6">
        {profileIncomplete && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <AlertTriangle
              size={16}
              className="text-amber-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-amber-800">
              Perfil nutricional incompleto —{" "}
              <a href="/perfil" className="underline font-medium">
                complete aqui
              </a>{" "}
              antes de agendar.
            </p>
          </div>
        )}
        {eligibility && !eligibility.canBook && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5">
            <CalendarDays size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              {eligibility.reason} — disponível a partir de{" "}
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
        )}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── LEFT: Upcoming events ── */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Agenda
            </p>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Próximas consultas
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma consulta agendada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((c) => {
                  const bz = new Date(
                    new Date(c.scheduledAt).getTime() - 3 * 3600_000,
                  );
                  const hh = String(bz.getUTCHours()).padStart(2, "0");
                  const canCancel =
                    new Date(c.scheduledAt).getTime() - consultasLoadedAt >
                    publicConfig.cancelDays * 86_400_000;
                  return (
                    <div
                      key={c.id}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                    >
                      <span
                        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${c.status === "CONFIRMED" ? "bg-green-500" : "bg-yellow-400"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-medium">
                          {new Date(c.scheduledAt).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · {hh}:00
                        </p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
                          Consulta nutricional
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}
                          >
                            {STATUS_LABEL[c.status]}
                          </span>
                          {c.meetingLink && (
                            <a
                              href={c.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-green-700 flex items-center gap-0.5 hover:underline"
                            >
                              <Video size={10} /> Entrar
                            </a>
                          )}
                        </div>
                      </div>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => setCancelConfirm(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition shrink-0"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Past history */}
            {past.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">
                  Histórico
                </p>
                <div className="space-y-2">
                  {past.slice(0, 3).map((c) => {
                    const bz = new Date(
                      new Date(c.scheduledAt).getTime() - 3 * 3600_000,
                    );
                    const hh = String(bz.getUTCHours()).padStart(2, "0");
                    return (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 px-1 opacity-60"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">
                            {new Date(c.scheduledAt).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              },
                            )}{" "}
                            · {hh}:00
                          </p>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}
                          >
                            {STATUS_LABEL[c.status]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Calendar + slot picker ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Calendar card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  disabled={
                    calYear === TODAY.getFullYear() &&
                    calMonth === TODAY.getMonth()
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* DOW header */}
            <div className="grid grid-cols-7 mb-2">
              {DOW_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-gray-400 py-1 select-none"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid — full height cells */}
            <div className="grid grid-cols-7 border-l border-t border-gray-100">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div
                  key={`e-${i}`}
                  className="border-r border-b border-gray-100 min-h-18"
                />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const dateStr = calDateStr(day);
                  const isToday = dateStr === todayStr;
                  const isBlocked = blockedDates.has(dateStr);
                  const isSelected = selectedDate === dateStr;
                  const event = consultationByDate.get(dateStr);
                  const disabled =
                    !isBizDay(day) ||
                    isBeforeToday(day) ||
                    isBeforeEarliestDate(day) ||
                    isBlocked ||
                    !!event;
                  const available = !disabled;

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (available)
                          setSelectedDate(isSelected ? null : dateStr);
                      }}
                      className={[
                        "border-r border-b border-gray-100 min-h-18 p-1.5 flex flex-col transition-colors",
                        available ? "cursor-pointer hover:bg-green-50/60" : "",
                        isSelected ? "bg-green-50" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {/* Day number */}
                      <span
                        className={[
                          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium select-none self-end",
                          isToday ? "bg-green-600 text-white" : "",
                          isSelected && !isToday
                            ? "bg-green-100 text-green-700"
                            : "",
                          !isToday && !isSelected && available
                            ? "text-gray-800"
                            : "",
                          !isToday &&
                          !isSelected &&
                          !available &&
                          !isBlocked &&
                          !event
                            ? "text-gray-300"
                            : "",
                          isBlocked ? "text-red-300" : "",
                          event && !isToday ? "text-gray-800" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {day}
                      </span>

                      {/* Event block */}
                      {event && (
                        <div
                          className={`mt-1 rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight ${EVENT_PILL[event.status]}`}
                        >
                          <div className="flex items-center gap-1">
                            <Clock size={9} className="shrink-0" />
                            {String(
                              new Date(
                                new Date(event.scheduledAt).getTime() -
                                  3 * 3600_000,
                              ).getUTCHours(),
                            ).padStart(2, "0")}
                            :00
                          </div>
                          <div className="truncate">Consulta</div>
                        </div>
                      )}

                      {/* Selected indicator */}
                      {isSelected && !event && (
                        <div className="mt-1 rounded-md px-1.5 py-1 text-[11px] font-medium bg-green-600 text-white leading-tight">
                          Selecionado
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-3 rounded bg-green-600 inline-block" />{" "}
                Hoje
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-3 rounded bg-yellow-100 inline-block" />{" "}
                Aguardando
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-3 rounded bg-green-100 inline-block" />{" "}
                Confirmada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-3 rounded bg-green-50 border border-green-200 inline-block" />{" "}
                Selecionado
              </span>
            </div>
          </div>

          {/* ── Slot picker panel — appears below calendar when date selected ── */}
          {bookingSuccess ? (
            <div className="bg-white rounded-2xl border border-green-200 p-6 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <svg
                  className="w-7 h-7 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-bold text-gray-900">
                  Solicitação enviada!
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Aguarde a confirmação da nutricionista.
                </p>
                <p className="text-sm font-semibold text-green-700 mt-2 capitalize">
                  {new Date(
                    bookingSuccess.date + "T12:00:00Z",
                  ).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  às {String(bookingSuccess.hour).padStart(2, "0")}:00
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                className="shrink-0 text-sm text-green-700 font-medium border border-green-200 rounded-xl px-4 py-2 hover:bg-green-50 transition"
              >
                Agendar outra
              </button>
            </div>
          ) : selectedDate ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    setBookingHour(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                <div>
                  <p className="font-bold text-gray-900 capitalize text-base leading-tight">
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
                    Selecione um horário — Brasília (UTC-3)
                  </p>
                </div>
              </div>

              {slotsLoading ? (
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 w-24 rounded-xl bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Clock size={18} className="opacity-40" />
                  <p className="text-sm">
                    Sem horários disponíveis. Tente outra data.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() =>
                        setBookingHour(bookingHour === h ? null : h)
                      }
                      className={[
                        "h-10 px-4 rounded-xl text-sm font-semibold border transition-all flex items-center gap-1.5",
                        bookingHour === h
                          ? "bg-green-600 text-white border-green-600 shadow-sm"
                          : "border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50 hover:text-green-700",
                      ].join(" ")}
                    >
                      <Clock size={12} className="shrink-0" />
                      {String(h).padStart(2, "0")}:00
                    </button>
                  ))}
                </div>
              )}

              {bookingHour !== null && (
                <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
                      Resumo
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5 capitalize">
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      Consulta nutricional · Online
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={booking}
                    className="shrink-0 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition shadow-sm"
                  >
                    {booking ? "Agendando..." : "Confirmar"}
                  </button>
                </div>
              )}

              {bookError && (
                <p className="text-sm text-red-600 mt-3">{bookError}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
