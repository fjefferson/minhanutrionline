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
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../lib/api';
import type { RootStackParamList } from '../../navigation/types';

/* ─── Types ─────────────────────────────────────────────── */
interface DosageLog {
  id: string;
  medication: string;
  doseMg: number | null;
  startDate: string;
  endDate: string | null;
  changeReason: string | null;
  prescribedBy: string | null;
  nextChangePlanned: string | null;
  toleranceNotes: string | null;
  createdAt: string;
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
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const GLP1_MEDS = [
  'Ozempic',
  'Wegovy',
  'Rybelsus',
  'Semaglutida manipulada',
  'Mounjaro',
  'Tirzepatida manipulada',
  'Saxenda',
];

const INITIAL_FORM = {
  medication: '',
  doseMg: '',
  startDate: todayDisplay(),
  changeReason: '',
  prescribedBy: '',
  nextChangePlanned: '',
  toleranceNotes: '',
};

/* ─── Screen ─────────────────────────────────────────────── */
export default function DosageScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [view, setView] = useState<ScreenView>('list');
  const [logs, setLogs] = useState<DosageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      const { data } = await api.get<DosageLog[]>('/glp1/dosage-history');
      setLogs(data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Excluir dose',
      'Tem certeza que deseja excluir este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await api.delete(`/glp1/dosage-change/${id}`);
              await loadLogs();
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
    if (!form.medication) {
      setError('Selecione o medicamento.');
      return;
    }
    if (!form.startDate || form.startDate.length < 10) {
      setError('Informe a data de início no formato DD/MM/AAAA.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/glp1/dosage-change', {
        medication: form.medication,
        doseMg: form.doseMg ? Number(form.doseMg) : undefined,
        startDate: toIsoDate(form.startDate),
        changeReason: form.changeReason || undefined,
        prescribedBy: form.prescribedBy || undefined,
        nextChangePlanned: form.nextChangePlanned
          ? toIsoDate(form.nextChangePlanned)
          : undefined,
        toleranceNotes: form.toleranceNotes || undefined,
      });
      setForm({ ...INITIAL_FORM });
      setView('list');
      await loadLogs();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

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
            <Text style={styles.headerTitle}>Doses GLP-1</Text>
            <Text style={styles.headerSub}>
              Histórico de medicamentos e doses
            </Text>
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
          ) : logs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="medical-outline" size={48} color="#d1fae5" />
              <Text style={styles.emptyTitle}>Nenhuma dose registrada</Text>
              <Text style={styles.emptySub}>
                Registre seu medicamento e dose atual.
              </Text>
            </View>
          ) : (
            logs.map((log, idx) => {
              const isActive = !log.endDate;
              const isExpanded = expandedId === log.id;
              return (
                <View key={log.id} style={styles.timelineRow}>
                  {/* Linha da timeline */}
                  <View style={styles.timelineTrack}>
                    <View
                      style={[
                        styles.timelineDot,
                        isActive && styles.timelineDotActive,
                      ]}
                    />
                    {idx < logs.length - 1 && (
                      <View style={styles.timelineConnector} />
                    )}
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    style={[styles.logCard, isActive && styles.logCardActive]}
                    onPress={() => setExpandedId(isExpanded ? null : log.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.logCardHeader}>
                      <View style={{ flex: 1 }}>
                        {isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>
                              Dose atual
                            </Text>
                          </View>
                        )}
                        <Text style={styles.logMed}>
                          {log.medication}
                          {log.doseMg != null && (
                            <Text style={styles.logDose}>
                              {'  '}
                              {log.doseMg} mg
                            </Text>
                          )}
                        </Text>
                        <View style={styles.logDatesRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color="#9ca3af"
                          />
                          <Text style={styles.logDatesText}>
                            {fmtDate(log.startDate)}
                            {log.endDate
                              ? ` → ${fmtDate(log.endDate)}`
                              : ' → atual'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.logActions}>
                        <TouchableOpacity
                          onPress={() => handleDelete(log.id)}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          {deletingId === log.id ? (
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
                      <View style={styles.logExpanded}>
                        {log.changeReason ? (
                          <View style={styles.logDetail}>
                            <Text style={styles.logDetailLabel}>Motivo</Text>
                            <Text style={styles.logDetailText}>
                              {log.changeReason}
                            </Text>
                          </View>
                        ) : null}
                        {log.prescribedBy ? (
                          <View style={styles.logDetail}>
                            <Text style={styles.logDetailLabel}>
                              Prescrito por
                            </Text>
                            <Text style={styles.logDetailText}>
                              {log.prescribedBy}
                            </Text>
                          </View>
                        ) : null}
                        {log.nextChangePlanned ? (
                          <View style={styles.logDetail}>
                            <Text style={styles.logDetailLabel}>
                              Próxima troca
                            </Text>
                            <Text style={styles.logDetailText}>
                              {fmtDate(log.nextChangePlanned)}
                            </Text>
                          </View>
                        ) : null}
                        {log.toleranceNotes ? (
                          <View style={styles.logDetail}>
                            <Text style={styles.logDetailLabel}>
                              Observações
                            </Text>
                            <Text style={styles.logDetailText}>
                              {log.toleranceNotes}
                            </Text>
                          </View>
                        ) : null}
                        {!log.changeReason &&
                          !log.prescribedBy &&
                          !log.nextChangePlanned &&
                          !log.toleranceNotes && (
                            <Text style={styles.logDetailText}>
                              Sem informações adicionais.
                            </Text>
                          )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setForm({ ...INITIAL_FORM });
            setError('');
            setView('form');
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Registrar dose</Text>
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
        <Text style={styles.headerTitle}>Registrar dose</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Medicamento *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GLP1_MEDS.map(med => (
              <TouchableOpacity
                key={med}
                style={[
                  styles.chip,
                  form.medication === med && styles.chipActive,
                ]}
                onPress={() => setForm(f => ({ ...f, medication: med }))}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.medication === med && styles.chipTextActive,
                  ]}
                >
                  {med}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Dose (mg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 0.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={form.doseMg}
              onChangeText={v =>
                setForm(f => ({
                  ...f,
                  doseMg: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                }))
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Data de início *</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={10}
              value={form.startDate}
              onChangeText={v =>
                setForm(f => ({ ...f, startDate: maskDate(v) }))
              }
            />
          </View>
        </View>

        <Text style={styles.label}>Prescrito por</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Dra. Ana Silva"
          placeholderTextColor="#9ca3af"
          value={form.prescribedBy}
          onChangeText={v => setForm(f => ({ ...f, prescribedBy: v }))}
        />

        <Text style={styles.label}>Motivo da mudança</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Aumento de dose, ajuste de tolerância..."
          placeholderTextColor="#9ca3af"
          value={form.changeReason}
          onChangeText={v => setForm(f => ({ ...f, changeReason: v }))}
        />

        <Text style={styles.label}>Próxima troca prevista</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          maxLength={10}
          value={form.nextChangePlanned}
          onChangeText={v =>
            setForm(f => ({ ...f, nextChangePlanned: maskDate(v) }))
          }
        />

        <Text style={styles.label}>Observações de tolerância</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Ex: náuseas leves nas primeiras semanas..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={form.toleranceNotes}
          onChangeText={v => setForm(f => ({ ...f, toleranceNotes: v }))}
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
          <Text style={styles.submitBtnText}>Salvar dose</Text>
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

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },

  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timelineTrack: { alignItems: 'center', paddingTop: 6 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  timelineDotActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },

  logCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  logCardActive: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  logCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginBottom: 4,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  logMed: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  logDose: { fontSize: 13, fontWeight: '400', color: '#6b7280' },
  logDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logDatesText: { fontSize: 12, color: '#9ca3af' },
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  logExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  logDetail: { gap: 2 },
  logDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logDetailText: { fontSize: 13, color: '#374151', lineHeight: 18 },

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
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
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
