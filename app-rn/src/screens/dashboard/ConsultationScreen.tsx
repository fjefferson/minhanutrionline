import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as AddCalendarEvent from 'react-native-add-calendar-event';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import PlanLock from '../../components/PlanLock';

/* ─── Types ─────────────────────────────────────────────── */
interface Consultation {
  id: string;
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  meetingLink?: string | null;
  notes?: string | null;
  cancelReason?: string | null;
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

/* ─── Helpers ────────────────────────────────────────────── */
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#16a34a',
  COMPLETED: '#3b82f6',
  CANCELLED: '#ef4444',
};

const STATUS_BG: Record<string, string> = {
  PENDING: '#fef3c7',
  CONFIRMED: '#f0fdf4',
  COMPLETED: '#eff6ff',
  CANCELLED: '#fef2f2',
};

function formatBrazilDate(isoUtc: string): string {
  const d = new Date(isoUtc);
  const hour = d.getUTCHours() - 3;
  const local = new Date(d.getTime() - 3 * 3_600_000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  return `${dd}/${mm}/${yyyy} às ${String(hour).padStart(2, '0')}:00`;
}

function isoToBrazilDateStr(isoUtc: string): string {
  const d = new Date(new Date(isoUtc).getTime() - 3 * 3_600_000);
  return d.toISOString().slice(0, 10);
}

function calDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`;
}

function todayStr(): string {
  const now = new Date();
  const bz = new Date(now.getTime() - 3 * 3_600_000);
  return bz.toISOString().slice(0, 10);
}

/* ─── Screen ─────────────────────────────────────────────── */

// Wrapper handles the plan guard before rendering hooks-heavy inner component
export default function ConsultationScreen() {
  const { planType } = useAuthStore();
  const plan = planType();

  if (plan !== 'PREMIUM') {
    return (
      <PlanLock
        icon="calendar"
        featureName="Consultas"
        description="As consultas com a nutricionista são exclusivas para assinantes Premium."
        requiredPlan="Premium"
      />
    );
  }

  return <ConsultationScreenInner />;
}

function ConsultationScreenInner() {
  const today = new Date();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [config, setConfig] = useState<PublicConfig>({
    bizHours: [8, 9, 10, 11, 14, 15, 16, 17],
    bizDays: [1, 2, 3, 4, 5],
    cancelDays: 5,
  });
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  // Calendar
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Slots
  const [slots, setSlots] = useState<number[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Booking
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // View: 'list' or 'calendar'
  const [view, setView] = useState<'list' | 'calendar'>('list');

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.allSettled([
        api.get<Consultation[]>('/consultations'),
        api.get<Eligibility>('/consultations/eligibility'),
      ]);
      if (c.status === 'fulfilled') setConsultations(c.value.data);
      if (e.status === 'fulfilled') setEligibility(e.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api
      .get<PublicConfig>('/consultations/config')
      .then(r => setConfig(r.data))
      .catch(() => {});
    api
      .get('/profile/nutritional')
      .then(r => {
        const p = r.data;
        if (!p || !p.gender || !p.heightCm || !p.weightKg || !p.goal) {
          setProfileIncomplete(true);
        }
      })
      .catch(() => {});
    // Poll consultas a cada 30s para refletir ações da nutricionista
    const poll = setInterval(() => load(), 30_000);
    return () => clearInterval(poll);
  }, [load]);

  /* ── Blocked dates for current month ── */
  useEffect(() => {
    const month = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    api
      .get<{ dates: string[] }>(`/consultations/blocked-dates?month=${month}`)
      .then(r => setBlockedDates(new Set(r.data.dates)))
      .catch(() => setBlockedDates(new Set()));
  }, [calYear, calMonth]);

  /* ── Load slots when date selected ── */
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlots([]);
    setSelectedHour(null);
    setBookError(null);
    api
      .get<{ slots: number[] }>(
        `/consultations/available-slots?date=${selectedDate}`,
      )
      .then(r => setSlots(r.data.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate]);

  /* ── Calendar helpers ── */
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  function isDaySelectable(day: number): boolean {
    const ds = calDateStr(calYear, calMonth, day);
    if (ds < todayStr()) return false;
    if (blockedDates.has(ds)) return false;
    const dow = new Date(calYear, calMonth, day).getDay();
    if (!config.bizDays.includes(dow)) return false;
    // Bloqueia enquanto elegibilidade não carrega ou durante carência/intervalo
    if (!eligibility || ds < eligibility.earliestDate) return false;
    // Dia com consulta já marcada (não cancelada) também fica indisponível
    if (isBooked(day)) return false;
    return true;
  }

  function isBooked(day: number): boolean {
    const ds = calDateStr(calYear, calMonth, day);
    return consultations
      .filter(c => c.status !== 'CANCELLED')
      .some(c => isoToBrazilDateStr(c.scheduledAt) === ds);
  }

  // Não pode voltar ao mês anterior ao atual
  const isPrevMonthDisabled =
    calYear === today.getFullYear() && calMonth === today.getMonth();

  const prevMonth = () => {
    if (isPrevMonthDisabled) return;
    setSelectedDate(null);
    if (calMonth === 0) {
      setCalYear(y => y - 1);
      setCalMonth(11);
    } else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (calMonth === 11) {
      setCalYear(y => y + 1);
      setCalMonth(0);
    } else setCalMonth(m => m + 1);
  };

  /* ── Book ── */
  async function handleBook() {
    if (!selectedDate || selectedHour === null || booking) return;
    setBooking(true);
    setBookError(null);
    try {
      await api.post('/consultations', {
        date: selectedDate,
        hour: selectedHour,
      });
      Alert.alert(
        'Consulta agendada!',
        `Sua consulta foi solicitada para ${calDateStr(
          calYear,
          calMonth,
          parseInt(selectedDate.slice(8, 10)),
        )
          .split('-')
          .reverse()
          .join('/')} às ${String(selectedHour).padStart(
          2,
          '0',
        )}:00.\nAguarde a confirmação da nutricionista.`,
      );
      setSelectedDate(null);
      setSelectedHour(null);
      setView('list');
      await load();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Erro ao agendar. Tente novamente.';
      setBookError(msg);
    } finally {
      setBooking(false);
    }
  }

  /* ── Cancel ── */
  function handleCancel(id: string) {
    Alert.alert(
      'Cancelar consulta',
      'Deseja cancelar esta consulta? Esta ação não pode ser desfeita.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar consulta',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/consultations/${id}`);
              Alert.alert('Consulta cancelada.');
              load();
            } catch (err: any) {
              Alert.alert(
                'Erro',
                err?.response?.data?.message ?? 'Não foi possível cancelar.',
              );
            }
          },
        },
      ],
    );
  }

  /* ── Derived ── */
  const upcoming = consultations.filter(
    c =>
      c.status !== 'CANCELLED' &&
      c.status !== 'COMPLETED' &&
      new Date(c.scheduledAt) > new Date(),
  );
  const past = consultations.filter(
    c =>
      c.status === 'COMPLETED' ||
      c.status === 'CANCELLED' ||
      new Date(c.scheduledAt) <= new Date(),
  );

  /* ─────────────────────────────────────────
     CALENDAR VIEW
  ───────────────────────────────────────── */
  if (view === 'calendar') {
    const cells: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setView('list');
              setSelectedDate(null);
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agendar consulta</Text>
          {eligibility && !eligibility.canBook && (
            <Text style={styles.headerSub}>
              Disponível a partir de{' '}
              {eligibility.earliestDate.split('-').reverse().join('/')}
            </Text>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.calScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={prevMonth}
              style={[
                styles.navBtn,
                isPrevMonthDisabled && styles.navBtnDisabled,
              ]}
              disabled={isPrevMonthDisabled}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={isPrevMonthDisabled ? '#d1d5db' : '#374151'}
              />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[calMonth]} {calYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* DOW headers */}
          <View style={styles.dowRow}>
            {DOW_LABELS.map(d => (
              <Text key={d} style={styles.dowLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.calGrid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.calCell} />;
              const ds = calDateStr(calYear, calMonth, day);
              const selectable = isDaySelectable(day);
              const booked = isBooked(day);
              const isSelected = selectedDate === ds;
              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    styles.calCell,
                    isSelected && styles.calCellSelected,
                    booked && !isSelected && styles.calCellBooked,
                    !selectable && styles.calCellDisabled,
                  ]}
                  onPress={() => selectable && setSelectedDate(ds)}
                  disabled={!selectable}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.calCellText,
                      isSelected && styles.calCellTextSelected,
                      !selectable && styles.calCellTextDisabled,
                      booked && !isSelected && styles.calCellTextBooked,
                    ]}
                  >
                    {day}
                  </Text>
                  {booked && <View style={styles.calCellDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: '#16a34a' }]}
              />
              <Text style={styles.legendText}>Selecionado</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: '#d1fae5' }]}
              />
              <Text style={styles.legendText}>Já agendado</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: '#f3f4f6' }]}
              />
              <Text style={styles.legendText}>Indisponível</Text>
            </View>
          </View>

          {/* Slots */}
          {selectedDate && (
            <View style={styles.slotsSection}>
              <Text style={styles.slotsSectionTitle}>
                Horários disponíveis —{' '}
                {selectedDate.split('-').reverse().join('/')}
              </Text>

              {slotsLoading ? (
                <ActivityIndicator color="#16a34a" style={{ marginTop: 16 }} />
              ) : slots.length === 0 ? (
                <View style={styles.noSlots}>
                  <Ionicons name="time-outline" size={32} color="#d1d5db" />
                  <Text style={styles.noSlotsText}>
                    Nenhum horário disponível neste dia.
                  </Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.slotBtn,
                        selectedHour === h && styles.slotBtnSelected,
                      ]}
                      onPress={() => setSelectedHour(h)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.slotBtnText,
                          selectedHour === h && styles.slotBtnTextSelected,
                        ]}
                      >
                        {String(h).padStart(2, '0')}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {bookError && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#ef4444"
                  />
                  <Text style={styles.errorText}>{bookError}</Text>
                </View>
              )}

              {selectedHour !== null && (
                <TouchableOpacity
                  style={[styles.bookBtn, booking && styles.bookBtnLoading]}
                  onPress={handleBook}
                  disabled={booking}
                  activeOpacity={0.85}
                >
                  {booking ? (
                    <ActivityIndicator color="#fff" size={18} />
                  ) : (
                    <>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.bookBtnText}>
                        Confirmar — {String(selectedHour).padStart(2, '0')}:00
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  /* ─────────────────────────────────────────
     LIST VIEW
  ───────────────────────────────────────── */
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Consultas</Text>
        <Text style={styles.headerSub}>Acompanhamento com Elane Oliveira</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listScroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Perfil incompleto */}
            {profileIncomplete && (
              <View style={styles.warningBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#d97706"
                />
                <Text style={styles.warningText}>
                  Perfil nutricional incompleto — complete em{' '}
                  <Text style={{ fontWeight: '700' }}>Perfil</Text> antes de
                  agendar.
                </Text>
              </View>
            )}

            {/* Próximas */}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Próximas consultas</Text>
                {upcoming.map(c => (
                  <ConsultationCard
                    key={c.id}
                    consultation={c}
                    onCancel={handleCancel}
                    cancelDays={config.cancelDays}
                  />
                ))}
              </View>
            )}

            {/* Sem consultas */}
            {upcoming.length === 0 && past.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={52} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Nenhuma consulta ainda</Text>
                <Text style={styles.emptyText}>
                  Agende sua primeira consulta com a nutricionista.
                </Text>
              </View>
            )}

            {/* Histórico */}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Histórico</Text>
                {past.map(c => (
                  <ConsultationCard
                    key={c.id}
                    consultation={c}
                    onCancel={handleCancel}
                    cancelDays={config.cancelDays}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setView('calendar')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── ConsultationCard ───────────────────────────────────── */
function ConsultationCard({
  consultation: c,
  onCancel,
  cancelDays,
}: {
  consultation: Consultation;
  onCancel: (id: string) => void;
  cancelDays: number;
}) {
  const canCancel =
    c.status !== 'CANCELLED' &&
    c.status !== 'COMPLETED' &&
    new Date(c.scheduledAt).getTime() - Date.now() > cancelDays * 86_400_000;

  const handleAddToCalendar = () => {
    const dt = new Date(c.scheduledAt);
    const endDt = new Date(dt.getTime() + 60 * 60 * 1000); // assume 1 hora de consulta

    const eventConfig = {
      title: 'Consulta Nutricional - MinhaNutri',
      startDate: dt.toISOString(),
      endDate: endDt.toISOString(),
      notes: c.meetingLink
        ? `Link da videochamada: ${c.meetingLink}`
        : 'Consulta com Elane Oliveira.',
    };

    AddCalendarEvent.presentEventCreatingDialog(eventConfig)
      .then((eventInfo: any) => {
        // Evento criado
      })
      .catch((error: any) => {
        // user cancellou ou deu erro
        console.warn(error);
      });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="calendar-outline" size={20} color="#16a34a" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardDate}>{formatBrazilDate(c.scheduledAt)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_BG[c.status] },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[c.status] },
              ]}
            />
            <Text
              style={[styles.statusText, { color: STATUS_COLOR[c.status] }]}
            >
              {STATUS_LABEL[c.status]}
            </Text>
          </View>
        </View>
        {canCancel && (
          <TouchableOpacity
            onPress={() => onCancel(c.id)}
            style={styles.cancelBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardActionsRow}>
        {c.meetingLink && (
          <TouchableOpacity
            style={styles.meetingLinkRow}
            onPress={() => Linking.openURL(c.meetingLink!)}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam-outline" size={15} color="#16a34a" />
            <Text style={styles.meetingLinkText}>Entrar na videochamada</Text>
          </TouchableOpacity>
        )}

        {c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={handleAddToCalendar}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={15} color="#2563eb" />
            <Text style={styles.calendarBtnText}>Adicionar ao calendário</Text>
          </TouchableOpacity>
        )}
      </View>

      {c.notes && (
        <View style={styles.notesRow}>
          <Ionicons name="document-text-outline" size={14} color="#9ca3af" />
          <Text style={styles.notesText}>{c.notes}</Text>
        </View>
      )}

      {c.cancelReason && c.status === 'CANCELLED' && (
        <View style={styles.cancelReasonRow}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#ef4444"
          />
          <Text style={styles.cancelReasonText}>{c.cancelReason}</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CELL_SIZE = 44;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  backBtn: { padding: 4, marginBottom: 16, alignSelf: 'flex-start' },

  listScroll: { padding: 20, paddingBottom: 110 },

  // Alerts
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 114,
    right: 20,
    backgroundColor: '#2563EB', // Royal Blue
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  scheduleCardDisabled: { opacity: 0.75, elevation: 1 },
  scheduleCardGradient: { borderRadius: 16 },
  scheduleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  scheduleCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleCardTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scheduleCardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cancelBtn: { paddingTop: 2 },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  meetingLinkRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  meetingLinkText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
    textAlign: 'center',
  },
  calendarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  calendarBtnText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  notesText: { fontSize: 13, color: '#6b7280', flex: 1, lineHeight: 18 },
  cancelReasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  cancelReasonText: {
    fontSize: 12,
    color: '#ef4444',
    flex: 1,
    lineHeight: 17,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  // Calendar
  calScroll: { padding: 16, paddingBottom: 110 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  monthLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dowLabel: {
    width: `${100 / 7}%` as any,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    paddingBottom: 4,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  calCellSelected: {
    backgroundColor: '#16a34a',
  },
  calCellBooked: {
    backgroundColor: '#d1fae5',
  },
  calCellDisabled: {
    opacity: 0.35,
  },
  calCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  calCellTextSelected: { color: '#fff', fontWeight: '800' },
  calCellTextDisabled: { color: '#9ca3af' },
  calCellTextBooked: { color: '#16a34a' },
  calCellDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    position: 'absolute',
    bottom: 4,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  legendText: { fontSize: 11, color: '#6b7280' },

  // Slots
  slotsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  slotsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  noSlots: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  noSlotsText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotBtn: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minWidth: 78,
    alignItems: 'center',
  },
  slotBtnSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  slotBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  slotBtnTextSelected: { color: '#fff' },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: { fontSize: 13, color: '#ef4444', flex: 1 },

  // Book button
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
  },
  bookBtnLoading: { opacity: 0.7 },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
