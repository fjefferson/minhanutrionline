import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import type {
  MainTabParamList,
  RootStackParamList,
} from '../../navigation/types';

/* ─── Types ─────────────────────────────────────────────── */
interface Symptom {
  slug: string;
  name: string;
}

interface Report {
  id: string;
  aiResponse: string;
  extraNotes: string | null;
  createdAt: string;
  helpful: boolean | null;
  reviewRequested: boolean;
  reviewResponse: string | null;
  symptoms: { symptom: { name: string; slug: string } }[];
}

type ScreenView = 'history' | 'form' | 'result';

const MIN_NOTES_LENGTH = 10;

/* ─── Greeting helper ────────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* Strip markdown for plain preview */
function stripMd(text: string, maxLen = 110): string {
  return text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/[-*]\s/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen)
    .concat('...');
}

/* ─── Free limit modal ───────────────────────────────────── */
function FreeLimitModal({
  visible,
  onClose,
  onGoToPlans,
}: {
  visible: boolean;
  onClose: () => void;
  onGoToPlans: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalIconRow}>
            <Ionicons name="lock-closed" size={32} color="#f59e0b" />
          </View>
          <Text style={styles.modalTitle}>Limite gratuito atingido</Text>
          <Text style={styles.modalBody}>
            Você usou todas as 3 orientações gratuitas com IA. Assine um plano
            para orientações ilimitadas.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={onClose}
            >
              <Text style={styles.modalSecondaryBtnText}>Entendi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={onGoToPlans}>
              <Text style={styles.modalBtnText}>Assinar plano</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Profile gate modal ─────────────────────────────────── */
function ProfileGateModal({
  visible,
  onClose,
  onContinue,
  onCompleteProfile,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  onCompleteProfile: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalIconRow}>
            <Ionicons name="person-circle-outline" size={32} color="#16a34a" />
          </View>
          <Text style={styles.modalTitle}>Perfil incompleto</Text>
          <Text style={styles.modalBody}>
            Você pode preencher seu perfil nutricional para receber orientações
            mais precisas, mas também pode continuar agora mesmo.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={onContinue}
            >
              <Text style={styles.modalSecondaryBtnText}>
                Continuar assim mesmo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={onCompleteProfile}
            >
              <Text style={styles.modalBtnText}>Completar perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Main Screen ────────────────────────────────────────── */
export default function Glp1Screen() {
  return <Glp1ScreenInner />;
}

function Glp1ScreenInner() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<MainTabParamList>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const [view, setView] = useState<ScreenView>('history');
  const [history, setHistory] = useState<Report[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  const [freeAiUsed, setFreeAiUsed] = useState(0);
  const [freeAiLimit] = useState(3);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  // form
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // result
  const [result, setResult] = useState<Report | null>(null);
  const [rating, setRating] = useState<boolean | null>(null);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);

  const loadSymptoms = useCallback(async () => {
    try {
      const response = await api.get<Symptom[]>('/glp1/symptoms');
      setSymptoms(response.data);
    } catch {
      // silencioso
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [histRes, freeRes, profRes] = await Promise.allSettled([
        api.get<Report[]>('/glp1/reports'),
        api.get<{
          hasActivePlan: boolean;
          freeAiUsed: number;
          freeAiLimit: number;
        }>('/glp1/free-status'),
        api.get<{
          gender?: string;
          heightCm?: number;
          weightKg?: number;
          goal?: string;
        }>('/profile/nutritional'),
      ]);

      if (histRes.status === 'fulfilled') setHistory(histRes.value.data);
      if (freeRes.status === 'fulfilled') {
        const f = freeRes.value.data;
        setHasActivePlan(f.hasActivePlan);
        setFreeAiUsed(f.freeAiUsed);
      }
      if (profRes.status === 'fulfilled') {
        const p = profRes.value.data;
        const incomplete = !p.gender || !p.heightCm || !p.weightKg || !p.goal;
        setIsProfileIncomplete(!!incomplete);
      }
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadSymptoms();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleSymptom = (slug: string) => {
    setSelected(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug],
    );
  };

  const handleCompleteProfile = () => {
    setShowProfileModal(false);
    navigation.navigate('Anamnesis', { returnTo: 'Glp1' });
  };

  const handleGoToPlans = () => {
    setShowFreeLimitModal(false);
    navigation.navigate('Plans');
  };

  const trimmedNotes = notes.trim();
  const canSubmitForm =
    selected.length > 0 && trimmedNotes.length >= MIN_NOTES_LENGTH;

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setFormError('Selecione ao menos um sintoma.');
      return;
    }
    if (trimmedNotes.length < MIN_NOTES_LENGTH) {
      setFormError('Descreva brevemente o que você está sentindo.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post<Report>(
        '/glp1/report',
        {
          symptoms: selected,
          extraNotes: trimmedNotes,
        },
        { timeout: 90000 },
      ); // IA pode demorar até ~60s
      setResult(res.data);
      setRating(null);
      setReviewDone(false);
      setReviewReason('');
      setShowReviewInput(false);
      setView('result');
      setHistory(prev => [res.data, ...prev]);
      if (!hasActivePlan) setFreeAiUsed(u => u + 1);
    } catch (err: any) {
      if (err?.response?.data?.code === 'FREE_LIMIT_REACHED') {
        setShowFreeLimitModal(true);
      } else if (
        err?.code === 'ECONNABORTED' ||
        err?.message?.includes('timeout')
      ) {
        setFormError(
          'A IA está demorando mais que o esperado. Aguarde um momento e verifique o histórico — sua orientação pode já ter sido gerada.',
        );
      } else {
        setFormError('Erro ao enviar orientação. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRate = async (helpful: boolean) => {
    if (!result || rating !== null) return;
    setRating(helpful);
    try {
      await api.patch(`/glp1/report/${result.id}/helpful`, { helpful });
    } catch {
      /* silencioso */
    }
  };

  const handleReview = async () => {
    if (!result || reviewDone) return;
    setReviewSending(true);
    try {
      await api.post(`/glp1/report/${result.id}/review`, { reviewReason });
      setReviewDone(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Não foi possível solicitar revisão. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setReviewSending(false);
    }
  };

  const goToForm = () => {
    loadSymptoms();
    setSelected([]);
    setNotes('');
    setFormError('');
    setView('form');
  };

  /* ── HISTORY VIEW ── */
  if (view === 'history') {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assistente de Orientações</Text>
          <Text style={styles.headerSub}>
            Orientações sobre sintomas com GLP-1
          </Text>
        </View>

        <FreeLimitModal
          visible={showFreeLimitModal && view === 'history'}
          onClose={() => setShowFreeLimitModal(false)}
          onGoToPlans={handleGoToPlans}
        />
        <ProfileGateModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onContinue={goToForm}
          onCompleteProfile={handleCompleteProfile}
        />

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
          {/* Contador gratuito */}
          {!hasActivePlan && (
            <View style={styles.freeCounter}>
              <Ionicons name="flash" size={15} color="#f59e0b" />
              <Text style={styles.freeCounterText}>
                {freeAiUsed}/{freeAiLimit} orientações gratuitas usadas
              </Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Histórico de orientações</Text>

          {/* Lista de histórico */}
          {loadingHistory ? (
            <ActivityIndicator color="#16a34a" style={{ marginTop: 32 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="search-circle-outline"
                size={48}
                color="#d1fae5"
              />
              <Text style={styles.emptyTitle}>Nenhuma orientação ainda</Text>
              <Text style={styles.emptySub}>
                Inicie sua primeira orientação sobre sintomas com GLP-1.
              </Text>
            </View>
          ) : (
            history.map((report, idx) => {
              // Compara com orientação anterior (idx+1 = mais antiga)
              const prev = history[idx + 1] ?? null;
              const prevSlugs = prev
                ? new Set(prev.symptoms.map(s => s.symptom.slug))
                : null;
              const currSlugs = new Set(
                report.symptoms.map(s => s.symptom.slug),
              );
              const improved = prevSlugs
                ? [...prevSlugs].filter(s => !currSlugs.has(s))
                : [];
              const worsened = prevSlugs
                ? [...currSlugs].filter(s => !prevSlugs.has(s))
                : [];

              const dateStr = new Date(report.createdAt).toLocaleDateString(
                'pt-BR',
                { day: '2-digit', month: 'short', year: 'numeric' },
              );

              return (
                <TouchableOpacity
                  key={report.id}
                  style={styles.sessionCard}
                  onPress={() => {
                    setResult(report);
                    setRating(report.helpful);
                    setReviewDone(report.reviewRequested);
                    setView('result');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionRow}>
                      <Text style={styles.sessionTitle}>Orientação GLP-1</Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {report.reviewRequested && (
                          <View style={styles.badgeReview}>
                            <Text style={styles.badgeReviewText}>Revisão</Text>
                          </View>
                        )}
                        {report.helpful === true && (
                          <Ionicons
                            name="thumbs-up"
                            size={14}
                            color="#16a34a"
                          />
                        )}
                        {report.helpful === false && (
                          <Ionicons
                            name="thumbs-down"
                            size={14}
                            color="#ef4444"
                          />
                        )}
                        <Text style={styles.sessionTime}>{dateStr}</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="#d1d5db"
                        />
                      </View>
                    </View>

                    {/* Chips de sintomas */}
                    <View style={styles.symptomChipsRow}>
                      {report.symptoms.slice(0, 4).map(s => (
                        <View
                          key={s.symptom.slug}
                          style={styles.symptomChipSmall}
                        >
                          <Text style={styles.symptomChipSmallText}>
                            {s.symptom.name}
                          </Text>
                        </View>
                      ))}
                      {report.symptoms.length > 4 && (
                        <Text style={styles.moreChips}>
                          +{report.symptoms.length - 4}
                        </Text>
                      )}
                    </View>

                    {/* Evolução em relação ao anterior */}
                    {(improved.length > 0 || worsened.length > 0) && (
                      <View style={styles.evolutionInlineRow}>
                        {improved.length > 0 && (
                          <View style={styles.evolutionPill}>
                            <Ionicons
                              name="trending-down"
                              size={11}
                              color="#15803d"
                            />
                            <Text style={styles.evolutionPillGreen}>
                              Melhorou:{' '}
                              {improved
                                .map(
                                  sl =>
                                    prev!.symptoms.find(
                                      s => s.symptom.slug === sl,
                                    )?.symptom.name ?? sl,
                                )
                                .join(', ')}
                            </Text>
                          </View>
                        )}
                        {worsened.length > 0 && (
                          <View
                            style={[
                              styles.evolutionPill,
                              styles.evolutionPillOrangeWrap,
                            ]}
                          >
                            <Ionicons
                              name="trending-up"
                              size={11}
                              color="#c2410c"
                            />
                            <Text style={styles.evolutionPillOrange}>
                              Novo:{' '}
                              {worsened
                                .map(
                                  sl =>
                                    report.symptoms.find(
                                      s => s.symptom.slug === sl,
                                    )?.symptom.name ?? sl,
                                )
                                .join(', ')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Nota da paciente */}
                    {!!report.extraNotes && (
                      <View style={styles.reportNoteRow}>
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={12}
                          color="#6b7280"
                        />
                        <Text style={styles.reportNoteText} numberOfLines={1}>
                          {report.extraNotes}
                        </Text>
                      </View>
                    )}

                    {/* Preview da resposta IA */}
                    <View style={styles.reportAiPreview}>
                      <Ionicons name="flash" size={11} color="#16a34a" />
                      <Text
                        style={styles.reportAiPreviewText}
                        numberOfLines={2}
                      >
                        {stripMd(report.aiResponse)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* FAB: Nova orientação */}
        <TouchableOpacity
          style={[styles.fab]}
          onPress={() => {
            if (isProfileIncomplete) {
              setShowProfileModal(true);
              return;
            }
            if (!hasActivePlan && freeAiUsed >= freeAiLimit) {
              setShowFreeLimitModal(true);
              return;
            }
            goToForm();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Nova orientação</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── FORM VIEW ── */
  if (view === 'form') {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setView('history')}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova orientação</Text>
          <Text style={styles.headerSub}>
            Selecione os sintomas que está sentindo
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bolha de saudação */}
          <View style={styles.chatBubbleRow}>
            <View style={styles.chatAiAvatar}>
              <Ionicons name="flash" size={16} color="#fff" />
            </View>
            <View style={styles.chatBubbleAi}>
              <Text style={styles.chatBubbleText}>
                {`${getGreeting()}${
                  firstName ? `, ${firstName}` : ''
                }! Como você está se sentindo hoje? 😊`}
              </Text>
            </View>
          </View>

          {/* Bolha pedindo sintomas */}
          <View style={styles.chatBubbleRow}>
            <View style={styles.chatAiAvatar}>
              <Ionicons name="flash" size={16} color="#fff" />
            </View>
            <View style={styles.chatBubbleAi}>
              <Text style={styles.chatBubbleText}>
                Selecione os sintomas que está sentindo:
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Sintomas</Text>
          <View style={styles.chipWrap}>
            {symptoms.map(sym => (
              <TouchableOpacity
                key={sym.slug}
                style={[
                  styles.chip,
                  selected.includes(sym.slug) && styles.chipActive,
                ]}
                onPress={() => toggleSymptom(sym.slug)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected.includes(sym.slug) && styles.chipTextActive,
                  ]}
                >
                  {sym.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bolha pedindo detalhes */}
          <View style={[styles.chatBubbleRow, { marginBottom: 8 }]}>
            <View style={styles.chatAiAvatar}>
              <Ionicons name="flash" size={16} color="#fff" />
            </View>
            <View style={styles.chatBubbleAi}>
              <Text style={styles.chatBubbleText}>
                Conte mais detalhes do que você está sentindo hoje:
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.textarea}
            placeholder="Ex: sinto mais após as refeições, há 3 dias, piora à noite..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={value => {
              setNotes(value);
              if (formError) {
                setFormError('');
              }
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {!!formError && <Text style={styles.errorText}>{formError}</Text>}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!canSubmitForm || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmitForm || submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>
                  Analisando seus sintomas...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Obter orientação</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ── RESULT VIEW ── */
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setView('history')}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultado - IA Nutri</Text>
        <Text style={styles.headerSub}>
          {result?.symptoms.map(s => s.symptom.name).join(', ')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Evolução em relação à orientação anterior */}
        {(() => {
          if (!result) return null;
          const prevReport = history.find(r => r.id !== result.id);
          if (!prevReport) return null;
          const prevSlugs = new Set(
            prevReport.symptoms.map(s => s.symptom.slug),
          );
          const currSlugs = new Set(result.symptoms.map(s => s.symptom.slug));
          const improved = [...prevSlugs].filter(s => !currSlugs.has(s));
          const newSyms = [...currSlugs].filter(s => !prevSlugs.has(s));
          if (improved.length === 0 && newSyms.length === 0) return null;

          const prevNames = (slug: string) =>
            prevReport.symptoms.find(s => s.symptom.slug === slug)?.symptom
              .name ?? slug;
          const currNames = (slug: string) =>
            result.symptoms.find(s => s.symptom.slug === slug)?.symptom.name ??
            slug;

          return (
            <View style={styles.evolutionCard}>
              <Text style={styles.evolutionTitle}>
                Evolução desde a última orientação
              </Text>
              {improved.length > 0 && (
                <View style={styles.evolutionRow}>
                  <Ionicons name="trending-down" size={16} color="#16a34a" />
                  <Text style={styles.evolutionTextGreen}>
                    <Text style={{ fontWeight: '700' }}>Melhorou: </Text>
                    {improved.map(s => prevNames(s)).join(', ')}
                  </Text>
                </View>
              )}
              {newSyms.length > 0 && (
                <View style={styles.evolutionRow}>
                  <Ionicons name="trending-up" size={16} color="#f97316" />
                  <Text style={styles.evolutionTextOrange}>
                    <Text style={{ fontWeight: '700' }}>Novo: </Text>
                    {newSyms.map(s => currNames(s)).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Resposta IA */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <Ionicons name="flash" size={16} color="#16a34a" />
            <Text style={styles.aiCardHeaderText}>
              Resposta da Nutricionista-IA
            </Text>
          </View>
          <Markdown style={markdownStyles}>{result?.aiResponse ?? ''}</Markdown>
        </View>

        {/* Avaliação */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>
            Esta orientação foi útil para você?
          </Text>
          <View style={styles.ratingBtns}>
            <TouchableOpacity
              style={[
                styles.ratingBtnFull,
                rating === true && styles.ratingBtnActiveGreen,
              ]}
              onPress={() => handleRate(true)}
              disabled={rating !== null}
            >
              <Ionicons
                name="thumbs-up"
                size={16}
                color={rating === true ? '#fff' : '#16a34a'}
              />
              <Text
                style={[
                  styles.ratingBtnText,
                  rating === true && { color: '#fff' },
                ]}
              >
                Sim, foi útil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.ratingBtnFull,
                rating === false && styles.ratingBtnActiveRed,
              ]}
              onPress={() => handleRate(false)}
              disabled={rating !== null}
            >
              <Ionicons
                name="thumbs-down"
                size={16}
                color={rating === false ? '#fff' : '#ef4444'}
              />
              <Text
                style={[
                  styles.ratingBtnText,
                  rating === false ? { color: '#fff' } : { color: '#ef4444' },
                ]}
              >
                Não ajudou
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Solicitar revisão */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewCardIconWrap}>
            <Ionicons name="refresh-circle" size={22} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewCardTitle}>
              Pedir revisão da nutricionista
            </Text>
            <Text style={styles.reviewCardSub}>
              Não ficou satisfeito? Solicite uma revisão humana.{' '}
              <Text style={{ fontWeight: '700' }}>
                Limite de 1 revisão por dia.
              </Text>
            </Text>
            {reviewDone ? (
              <View style={styles.reviewDoneInline}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.reviewDoneText}>
                  Revisão solicitada — a nutricionista entrará em contato em
                  breve.
                </Text>
              </View>
            ) : (
              <>
                {showReviewInput && (
                  <TextInput
                    style={[
                      styles.textarea,
                      { marginTop: 10, marginBottom: 10 },
                    ]}
                    placeholder="Descreva o motivo da revisão (opcional)..."
                    placeholderTextColor="#9ca3af"
                    value={reviewReason}
                    onChangeText={setReviewReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                )}
                <TouchableOpacity
                  style={[
                    styles.reviewBtn,
                    reviewSending && styles.submitBtnDisabled,
                  ]}
                  onPress={() => {
                    if (!showReviewInput) {
                      setShowReviewInput(true);
                      return;
                    }
                    handleReview();
                  }}
                  disabled={reviewSending}
                >
                  {reviewSending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.reviewBtnText}>
                      {showReviewInput ? 'Solicitar revisão' : 'Pedir revisão'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Resposta da revisão */}
        {result?.reviewResponse && (
          <View style={styles.reviewResponseCard}>
            <Text style={styles.reviewResponseLabel}>
              Resposta da Nutricionista
            </Text>
            <Text style={styles.reviewResponseText}>
              {result.reviewResponse}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Markdown styles ─────────────────────────────────────── */
const markdownStyles = StyleSheet.create({
  body: { fontSize: 14, color: '#374151', lineHeight: 22 },
  heading1: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 12,
  },
  heading2: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    marginTop: 10,
  },
  heading3: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  bullet_list: { marginVertical: 4 },
  list_item: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginVertical: 2,
  },
  strong: { fontWeight: '700', color: '#111827' },
  em: { fontStyle: 'italic' },
  code_inline: {
    backgroundColor: '#f3f4f6',
    fontFamily: 'monospace',
    fontSize: 13,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
});

/* ─── Styles ──────────────────────────────────────────────── */
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
    marginTop: 4,
  },
  headerSub: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backBtnText: { color: '#4b5563', fontSize: 15, fontWeight: '500' },
  scroll: { padding: 16, paddingBottom: 110 },

  freeCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  freeCounterText: { fontSize: 13, color: '#92400e', fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 114,
    right: 20,
    backgroundColor: '#2563EB', // Royal Blue
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 100, // Pílula
    paddingVertical: 14,
    gap: 6,
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },
  fabDisabled: { opacity: 0.5 },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  sessionInfo: { flex: 1 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  sessionTime: { fontSize: 12, color: '#9ca3af' },

  symptomChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badgeReview: {
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeReviewText: { fontSize: 10, color: '#7c3aed', fontWeight: '700' },
  symptomChipSmall: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  symptomChipSmallText: { fontSize: 11, color: '#15803d', fontWeight: '600' },
  moreChips: { fontSize: 11, color: '#9ca3af', alignSelf: 'center' },

  evolutionInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  evolutionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  evolutionPillOrangeWrap: { backgroundColor: '#fff7ed' },
  evolutionPillGreen: { fontSize: 11, color: '#15803d', fontWeight: '600' },
  evolutionPillOrange: { fontSize: 11, color: '#c2410c', fontWeight: '600' },

  reportNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  reportNoteText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
    fontStyle: 'italic',
  },

  reportAiPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
  },
  reportAiPreviewText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    lineHeight: 18,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    marginTop: 16,
  },

  // Chat bubbles (form view)
  chatBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  chatAiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatBubbleAi: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  chatBubbleText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#d1fae5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#15803d', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    marginBottom: 16,
  },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12 },

  submitBtn: {
    backgroundColor: '#2563EB', // Royal Blue
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // Pílula perfeita
    paddingVertical: 14,
    marginTop: 4,
    gap: 8,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  aiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  aiCardHeaderText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },

  // Evolution card
  evolutionCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  evolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  evolutionTextGreen: { fontSize: 13, color: '#15803d', flex: 1 },
  evolutionTextOrange: { fontSize: 13, color: '#c2410c', flex: 1 },

  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingBtns: { flexDirection: 'row', gap: 10 },
  ratingBtnFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 30,
    paddingVertical: 10,
  },
  ratingBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  ratingBtnActiveGreen: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  ratingBtnActiveRed: { backgroundColor: '#ef4444', borderColor: '#ef4444' },

  reviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  reviewCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  reviewCardSub: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 10,
  },
  reviewDoneInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reviewBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  reviewDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reviewDoneText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '600',
    flex: 1,
  },

  reviewResponseCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  reviewResponseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 6,
  },
  reviewResponseText: { fontSize: 14, color: '#1e3a8a', lineHeight: 20 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalIconRow: { marginBottom: 4 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  modalActions: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  modalSecondaryBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  modalBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
});
