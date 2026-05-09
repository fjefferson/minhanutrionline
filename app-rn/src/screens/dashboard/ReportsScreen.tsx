import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../lib/api';
import type { RootStackParamList } from '../../navigation/types';

/* ─── Types ─────────────────────────────────────────────── */
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

interface ProgressStats {
  currentWeight: number | null;
  totalLost: number | null;
  currentBMI: number | null;
  progressPct: number | null;
  weeklyAvgLoss: number | null;
}

interface DosageLog {
  id: string;
  medication: string;
  doseMg: number | null;
  startDate: string;
  endDate: string | null;
}

interface Glp1Report {
  id: string;
  createdAt: string;
  symptoms: { symptom: { name: string; slug: string } }[];
  helpful: boolean | null;
}

type Tab = 'peso' | 'doses' | 'sintomas';

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ─── Weight Line Chart (pure RN) ──────────────────────── */
function WeightLineChart({
  entries,
  chartWidth,
}: {
  entries: ProgressEntry[];
  chartWidth: number;
}) {
  const data = entries
    .filter(e => e.weightKg != null)
    .slice()
    .reverse()
    .slice(-8);

  if (data.length < 2) return null;

  const HEIGHT = 90;
  const PAD = 16;
  const usableW = chartWidth - PAD * 2;
  const usableH = HEIGHT - PAD;

  const values = data.map(e => e.weightKg!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const getX = (i: number) => PAD + (i / (values.length - 1)) * usableW;
  const getY = (v: number) => PAD / 2 + (1 - (v - min) / range) * usableH;

  return (
    <View style={{ height: HEIGHT + 20, position: 'relative', marginTop: 4 }}>
      {[0, 0.5, 1].map((t, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: PAD,
            right: PAD,
            top: PAD / 2 + (1 - t) * usableH,
            height: 1,
            backgroundColor: '#f3f4f6',
          }}
        />
      ))}
      {values.slice(1).map((v, i) => {
        const x1 = getX(i);
        const y1 = getY(values[i]);
        const x2 = getX(i + 1);
        const y2 = getY(v);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: cx - length / 2,
              top: cy - 1,
              width: length,
              height: 2,
              backgroundColor: '#16a34a',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: getX(i) - 4,
            top: getY(v) - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === values.length - 1 ? '#16a34a' : '#fff',
            borderWidth: 2,
            borderColor: '#16a34a',
          }}
        />
      ))}
      <Text
        style={{
          position: 'absolute',
          left: PAD,
          top: HEIGHT + 2,
          fontSize: 10,
          color: '#9ca3af',
        }}
      >
        {new Date(data[0].recordedAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        })}
      </Text>
      <Text
        style={{
          position: 'absolute',
          right: PAD,
          top: HEIGHT + 2,
          fontSize: 10,
          color: '#9ca3af',
          textAlign: 'right',
        }}
      >
        {new Date(data[data.length - 1].recordedAt).toLocaleDateString(
          'pt-BR',
          { day: '2-digit', month: 'short' },
        )}
      </Text>
    </View>
  );
}

/* ─── Screen ─────────────────────────────────────────────── */
export default function ReportsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<Tab>('peso');
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [dosageLogs, setDosageLogs] = useState<DosageLog[]>([]);
  const [glp1Reports, setGlp1Reports] = useState<Glp1Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [entriesRes, statsRes, dosageRes, reportsRes] =
        await Promise.allSettled([
          api.get<ProgressEntry[]>('/progress/entries'),
          api.get<ProgressStats>('/progress/stats'),
          api.get<DosageLog[]>('/glp1/dosage-history'),
          api.get<Glp1Report[]>('/glp1/reports'),
        ]);
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (dosageRes.status === 'fulfilled') setDosageLogs(dosageRes.value.data);
      if (reportsRes.status === 'fulfilled')
        setGlp1Reports(reportsRes.value.data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  /* Frequência de sintomas */
  const symFreq: { name: string; count: number }[] = (() => {
    const map: Record<string, { name: string; count: number }> = {};
    glp1Reports.forEach(r =>
      r.symptoms.forEach(s => {
        if (!map[s.symptom.slug])
          map[s.symptom.slug] = { name: s.symptom.name, count: 0 };
        map[s.symptom.slug].count++;
      }),
    );
    return Object.values(map).sort((a, b) => b.count - a.count);
  })();
  const maxFreq = symFreq[0]?.count ?? 1;

  const currentDose = dosageLogs.find(l => !l.endDate);
  const chartWidth = width - 40;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'peso', label: 'Evolução de Peso', icon: 'scale-outline' },
    { key: 'doses', label: 'Doses GLP-1', icon: 'medical-outline' },
    { key: 'sintomas', label: 'Sintomas', icon: 'pulse-outline' },
  ];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Meus Relatórios</Text>
          <Text style={styles.headerSub}>
            Dados consolidados da sua evolução
          </Text>
        </View>
      </View>

      {/* Segment tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons
              name={t.icon as any}
              size={14}
              color={activeTab === t.key ? '#16a34a' : '#9ca3af'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === t.key && styles.tabTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16a34a"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#16a34a" style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* ── TAB: PESO ── */}
            {activeTab === 'peso' && (
              <>
                {/* Stats */}
                <View style={styles.statsRow}>
                  <View
                    style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}
                  >
                    <Ionicons name="scale-outline" size={18} color="#16a34a" />
                    <Text style={styles.statValue}>
                      {stats?.currentWeight != null
                        ? `${stats.currentWeight} kg`
                        : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Peso atual</Text>
                  </View>
                  <View
                    style={[styles.statCard, { backgroundColor: '#eff6ff' }]}
                  >
                    <Ionicons
                      name="trending-down-outline"
                      size={18}
                      color="#3b82f6"
                    />
                    <Text style={styles.statValue}>
                      {stats?.totalLost != null && stats.totalLost > 0
                        ? `-${stats.totalLost} kg`
                        : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Total perdido</Text>
                  </View>
                  <View
                    style={[styles.statCard, { backgroundColor: '#fdf4ff' }]}
                  >
                    <Ionicons
                      name="analytics-outline"
                      size={18}
                      color="#a855f7"
                    />
                    <Text style={styles.statValue}>
                      {stats?.currentBMI != null
                        ? stats.currentBMI.toFixed(1)
                        : '—'}
                    </Text>
                    <Text style={styles.statLabel}>IMC</Text>
                  </View>
                  <View
                    style={[styles.statCard, { backgroundColor: '#fff7ed' }]}
                  >
                    <Ionicons name="flag-outline" size={18} color="#f97316" />
                    <Text style={styles.statValue}>
                      {stats?.progressPct != null
                        ? `${Math.round(stats.progressPct)}%`
                        : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Meta 10%</Text>
                  </View>
                </View>

                {/* Chart */}
                {entries.filter(e => e.weightKg != null).length >= 2 ? (
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Evolução do peso</Text>
                    <WeightLineChart
                      entries={entries}
                      chartWidth={chartWidth}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyBox}>
                    <Ionicons
                      name="bar-chart-outline"
                      size={40}
                      color="#d1fae5"
                    />
                    <Text style={styles.emptyText}>
                      Registre ao menos 2 medições de peso para ver o gráfico.
                    </Text>
                  </View>
                )}

                {/* Recent entries */}
                <Text style={styles.sectionLabel}>Últimas medições</Text>
                {entries.slice(0, 5).map(e => (
                  <View key={e.id} style={styles.miniEntry}>
                    <Text style={styles.miniEntryDate}>
                      {fmtDate(e.recordedAt)}
                    </Text>
                    <View style={styles.miniEntryBadges}>
                      {e.weightKg != null && (
                        <View style={styles.miniBadge}>
                          <Text style={styles.miniBadgeText}>
                            {e.weightKg} kg
                          </Text>
                        </View>
                      )}
                      {e.waistCm != null && (
                        <View
                          style={[
                            styles.miniBadge,
                            { backgroundColor: '#eff6ff' },
                          ]}
                        >
                          <Text
                            style={[styles.miniBadgeText, { color: '#3b82f6' }]}
                          >
                            {e.waistCm} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                {entries.length === 0 && (
                  <Text style={styles.emptyText}>
                    Nenhuma medição registrada.
                  </Text>
                )}
              </>
            )}

            {/* ── TAB: DOSES ── */}
            {activeTab === 'doses' && (
              <>
                {currentDose && (
                  <View style={styles.currentDoseCard}>
                    <View style={styles.currentDoseHeader}>
                      <View style={styles.currentDoseBadge}>
                        <Text style={styles.currentDoseBadgeText}>
                          Dose atual
                        </Text>
                      </View>
                      <Text style={styles.currentDoseDate}>
                        desde {fmtDate(currentDose.startDate)}
                      </Text>
                    </View>
                    <Text style={styles.currentDoseMed}>
                      {currentDose.medication}
                      {currentDose.doseMg != null && (
                        <Text style={styles.currentDoseMg}>
                          {'  '}
                          {currentDose.doseMg} mg
                        </Text>
                      )}
                    </Text>
                  </View>
                )}

                <Text style={styles.sectionLabel}>Histórico de doses</Text>
                {dosageLogs.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons
                      name="medical-outline"
                      size={40}
                      color="#d1fae5"
                    />
                    <Text style={styles.emptyText}>
                      Nenhuma dose registrada.
                    </Text>
                  </View>
                ) : (
                  dosageLogs.map(log => (
                    <View key={log.id} style={styles.doseRow}>
                      <View style={styles.doseDot} />
                      <View style={styles.doseInfo}>
                        <Text style={styles.doseMed}>
                          {log.medication}
                          {log.doseMg != null && (
                            <Text style={styles.doseMg}>
                              {'  '}
                              {log.doseMg} mg
                            </Text>
                          )}
                        </Text>
                        <Text style={styles.doseDates}>
                          {fmtDate(log.startDate)}
                          {log.endDate
                            ? ` → ${fmtDate(log.endDate)}`
                            : ' → atual'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {/* ── TAB: SINTOMAS ── */}
            {activeTab === 'sintomas' && (
              <>
                <View style={styles.symSummaryRow}>
                  <View
                    style={[styles.symStat, { backgroundColor: '#f0fdf4' }]}
                  >
                    <Text style={styles.symStatValue}>
                      {glp1Reports.length}
                    </Text>
                    <Text style={styles.symStatLabel}>Orientações</Text>
                  </View>
                  <View
                    style={[styles.symStat, { backgroundColor: '#eff6ff' }]}
                  >
                    <Text style={styles.symStatValue}>{symFreq.length}</Text>
                    <Text style={styles.symStatLabel}>Sintomas distintos</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Frequência de sintomas</Text>
                {symFreq.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="pulse-outline" size={40} color="#d1fae5" />
                    <Text style={styles.emptyText}>
                      Nenhuma orientação registrada ainda.
                    </Text>
                  </View>
                ) : (
                  symFreq.map(item => (
                    <View key={item.name} style={styles.freqRow}>
                      <Text style={styles.freqName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.freqBarWrap}>
                        <View
                          style={[
                            styles.freqBar,
                            { width: `${(item.count / maxFreq) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.freqCount}>{item.count}x</Text>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
  },
  tabBtnActive: { backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#16a34a' },

  scroll: { padding: 20, paddingBottom: 60 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  statLabel: { fontSize: 10, color: '#6b7280', textAlign: 'center' },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },

  miniEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  miniEntryDate: { fontSize: 13, color: '#374151', fontWeight: '600' },
  miniEntryBadges: { flexDirection: 'row', gap: 6 },
  miniBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniBadgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },

  currentDoseCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#86efac',
    marginBottom: 20,
  },
  currentDoseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currentDoseBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentDoseBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  currentDoseDate: { fontSize: 12, color: '#6b7280' },
  currentDoseMed: { fontSize: 16, fontWeight: '800', color: '#111827' },
  currentDoseMg: { fontSize: 14, fontWeight: '400', color: '#6b7280' },

  doseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  doseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginTop: 5,
  },
  doseInfo: { flex: 1 },
  doseMed: { fontSize: 14, fontWeight: '700', color: '#111827' },
  doseMg: { fontSize: 13, fontWeight: '400', color: '#6b7280' },
  doseDates: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  symSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  symStat: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  symStatValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  symStatLabel: { fontSize: 12, color: '#6b7280' },

  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  freqName: {
    fontSize: 13,
    color: '#374151',
    width: 120,
  },
  freqBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  freqBar: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 4,
  },
  freqCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    width: 28,
    textAlign: 'right',
  },
});
