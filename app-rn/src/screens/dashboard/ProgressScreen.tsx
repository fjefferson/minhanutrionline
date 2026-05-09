import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  createdAt: string;
}

interface ProgressStats {
  currentWeight: number | null;
  totalLost: number | null;
  currentBMI: number | null;
  progressPct: number | null;
  weeklyAvgLoss: number | null;
}

type ScreenView = 'list' | 'form';

/* ─── Helpers ───────────────────────────────────────────── */
function maskDate(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function toIsoDate(str: string): string {
  const [day, month, year] = str.split('/');
  return `${year}-${month}-${day}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function todayDisplay(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
}

function formFromEntry(
  entry: ProgressEntry | undefined,
): Record<string, string> {
  return {
    recordedAt: todayDisplay(),
    weightKg: entry?.weightKg?.toString() ?? '',
    waistCm: entry?.waistCm?.toString() ?? '',
    bodyFatPct: entry?.bodyFatPct?.toString() ?? '',
    bloodPressureSystolic: entry?.bloodPressureSystolic?.toString() ?? '',
    bloodPressureDiastolic: entry?.bloodPressureDiastolic?.toString() ?? '',
    notes: '',
  };
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
    <View style={{ height: HEIGHT + 20, position: 'relative' }}>
      {/* Grid */}
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
      {/* Lines */}
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
      {/* Dots */}
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
      {/* Date labels */}
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
export default function ProgressScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const [view, setView] = useState<ScreenView>('list');
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(
    formFromEntry(undefined),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [preFilled, setPreFilled] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [entriesRes, statsRes] = await Promise.allSettled([
        api.get<ProgressEntry[]>('/progress/entries'),
        api.get<ProgressStats>('/progress/stats'),
      ]);
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openForm = () => {
    const prefill = formFromEntry(entries[0]);
    setForm(prefill);
    setPreFilled(!!entries[0]);
    setError('');
    setView('form');
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Excluir medição',
      'Tem certeza que deseja excluir este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await api.delete(`/progress/entries/${id}`);
              await loadData();
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir. Tente novamente.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!form.weightKg && !form.waistCm && !form.bodyFatPct) {
      setError('Preencha ao menos uma medição.');
      return;
    }
    if (!form.recordedAt || form.recordedAt.length < 10) {
      setError('Informe a data no formato DD/MM/AAAA.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/progress/entries', {
        recordedAt: toIsoDate(form.recordedAt),
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        waistCm: form.waistCm ? Number(form.waistCm) : undefined,
        bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined,
        bloodPressureSystolic: form.bloodPressureSystolic
          ? Number(form.bloodPressureSystolic)
          : undefined,
        bloodPressureDiastolic: form.bloodPressureDiastolic
          ? Number(form.bloodPressureDiastolic)
          : undefined,
        notes: form.notes || undefined,
      });
      await loadData();
      setView('list');
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const chartWidth = width - 40; // 20px padding each side

  /* ── LIST VIEW ── */
  if (view === 'list') {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Minha Evolução</Text>
            <Text style={styles.headerSub}>Peso e medidas corporais</Text>
          </View>
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
              {/* Stats cards */}
              {stats && (
                <View style={styles.statsRow}>
                  <View
                    style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}
                  >
                    <Ionicons name="scale-outline" size={18} color="#16a34a" />
                    <Text style={styles.statValue}>
                      {stats.currentWeight != null
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
                      {stats.totalLost != null && stats.totalLost > 0
                        ? `-${stats.totalLost} kg`
                        : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Perdeu</Text>
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
                      {stats.currentBMI != null
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
                      {stats.progressPct != null
                        ? `${Math.round(stats.progressPct)}%`
                        : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Meta 10%</Text>
                  </View>
                </View>
              )}

              {/* Gráfico de peso */}
              {entries.filter(e => e.weightKg != null).length >= 2 && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Evolução do peso</Text>
                  <WeightLineChart entries={entries} chartWidth={chartWidth} />
                </View>
              )}

              {/* Histórico */}
              <Text style={styles.sectionLabel}>Histórico de medições</Text>
              {entries.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="bar-chart-outline"
                    size={48}
                    color="#d1fae5"
                  />
                  <Text style={styles.emptyTitle}>
                    Nenhuma medição registrada
                  </Text>
                  <Text style={styles.emptySub}>
                    Registre seu peso e medidas para acompanhar sua evolução.
                  </Text>
                </View>
              ) : (
                entries.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={styles.entryCard}
                      onPress={() =>
                        setExpandedId(isExpanded ? null : entry.id)
                      }
                      activeOpacity={0.85}
                    >
                      <View style={styles.entryHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryDate}>
                            {fmtDate(entry.recordedAt)}
                          </Text>
                          <View style={styles.entryValues}>
                            {entry.weightKg != null && (
                              <View style={styles.entryBadge}>
                                <Text style={styles.entryBadgeText}>
                                  {entry.weightKg} kg
                                </Text>
                              </View>
                            )}
                            {entry.waistCm != null && (
                              <View
                                style={[
                                  styles.entryBadge,
                                  { backgroundColor: '#eff6ff' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.entryBadgeText,
                                    { color: '#3b82f6' },
                                  ]}
                                >
                                  {entry.waistCm} cm cintura
                                </Text>
                              </View>
                            )}
                            {entry.bodyFatPct != null && (
                              <View
                                style={[
                                  styles.entryBadge,
                                  { backgroundColor: '#fdf4ff' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.entryBadgeText,
                                    { color: '#a855f7' },
                                  ]}
                                >
                                  {entry.bodyFatPct}% gordura
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.entryActions}>
                          <TouchableOpacity
                            onPress={() => handleDelete(entry.id)}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          >
                            {deletingId === entry.id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#fca5a5"
                              />
                            )}
                          </TouchableOpacity>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color="#d1d5db"
                          />
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.entryExpanded}>
                          {entry.bloodPressureSystolic != null &&
                            entry.bloodPressureDiastolic != null && (
                              <View style={styles.entryDetail}>
                                <Text style={styles.entryDetailLabel}>
                                  Pressão arterial
                                </Text>
                                <Text style={styles.entryDetailText}>
                                  {entry.bloodPressureSystolic}/
                                  {entry.bloodPressureDiastolic} mmHg
                                </Text>
                              </View>
                            )}
                          {entry.notes && (
                            <View style={styles.entryDetail}>
                              <Text style={styles.entryDetailLabel}>
                                Observações
                              </Text>
                              <Text style={styles.entryDetailText}>
                                {entry.notes}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={openForm}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Registrar medição</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── FORM VIEW ── */
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setView('list')}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar medição</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {preFilled && (
          <View style={styles.preFillBanner}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#1d4ed8"
            />
            <Text style={styles.preFillText}>
              Campos pré-preenchidos com sua última medição
            </Text>
          </View>
        )}

        <Text style={styles.label}>Data da medição *</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          maxLength={10}
          value={form.recordedAt}
          onChangeText={v => setForm(f => ({ ...f, recordedAt: maskDate(v) }))}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 78.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={form.weightKg}
              onChangeText={v => setForm(f => ({ ...f, weightKg: v }))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Cintura (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 85"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={form.waistCm}
              onChangeText={v => setForm(f => ({ ...f, waistCm: v }))}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Gordura corporal (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 28.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={form.bodyFatPct}
              onChangeText={v => setForm(f => ({ ...f, bodyFatPct: v }))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Pressão (Sistólica)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 120"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.bloodPressureSystolic}
              onChangeText={v =>
                setForm(f => ({ ...f, bloodPressureSystolic: v }))
              }
            />
          </View>
        </View>

        <Text style={styles.label}>Pressão Diastólica</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 80"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={form.bloodPressureDiastolic}
          onChangeText={v =>
            setForm(f => ({ ...f, bloodPressureDiastolic: v }))
          }
        />

        <Text style={styles.label}>Observações</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Ex: medido de manhã em jejum..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={form.notes}
          onChangeText={v => setForm(f => ({ ...f, notes: v }))}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="save-outline" size={18} color="#fff" />
          )}
          <Text style={styles.submitBtnText}>Salvar medição</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backBtnText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  scroll: { padding: 20, paddingBottom: 120 },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },

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
    marginBottom: 12,
  },

  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  entryDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  entryValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  entryBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  entryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  entryExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  entryDetail: { gap: 2 },
  entryDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryDetailText: { fontSize: 13, color: '#374151', lineHeight: 18 },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  preFillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  preFillText: { fontSize: 12, color: '#1d4ed8', flex: 1, lineHeight: 16 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  textarea: { height: 90, paddingTop: 12 },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 4, marginBottom: 8 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
