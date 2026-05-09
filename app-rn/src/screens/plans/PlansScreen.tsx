import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { RootStackParamList } from '../../navigation/types';

interface Plan {
  id: string;
  type: string;
  name: string;
  priceInCents: number;
  features: string[];
  active: boolean;
}

interface ScheduledDowngrade {
  plan: { name: string; type: string };
  effectiveAt: string | null;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HIGHLIGHT_TYPE = 'PLUS';
const PLAN_HIERARCHY: Record<string, number> = {
  BASIC: 1,
  PLUS: 2,
  PREMIUM: 3,
};

export default function PlansScreen() {
  const navigation = useNavigation<Nav>();
  const { planType } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState<string | null>(planType());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scheduledDowngrade, setScheduledDowngrade] =
    useState<ScheduledDowngrade | null>(null);

  // Bottom sheet de downgrade
  const [downgradeTarget, setDowngradeTarget] = useState<Plan | null>(null);
  const [downgradeLoading, setDowngradeLoading] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      api.get<Plan[]>('/plans'),
      api.get('/subscriptions/me').catch(() => ({ data: null })),
    ])
      .then(([plansRes, subRes]) => {
        setPlans(plansRes.data.filter((p: Plan) => p.active));
        const sub = subRes.data;
        setCurrentPlan(
          sub?.status === 'ACTIVE' ? sub.plan?.type ?? null : null,
        );
        if (sub?.scheduledDowngrade) {
          setScheduledDowngrade({
            plan: sub.scheduledDowngrade,
            effectiveAt: sub.currentPeriodEnd ?? null,
          });
        } else {
          setScheduledDowngrade(null);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const fmtPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const handlePlanPress = (plan: Plan) => {
    if (!currentPlan) {
      navigation.navigate('Checkout', { planType: plan.type });
      return;
    }
    const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
    const targetLevel = PLAN_HIERARCHY[plan.type] ?? 0;
    if (targetLevel < currentLevel) {
      setDowngradeTarget(plan);
    } else {
      navigation.navigate('Checkout', { planType: plan.type });
    }
  };

  const confirmDowngrade = async () => {
    if (!downgradeTarget) return;
    setDowngradeLoading(true);
    try {
      const res = await api.post('/subscriptions/downgrade', {
        planType: downgradeTarget.type,
      });
      setDowngradeTarget(null);
      const effectiveMsg = res.data.effectiveAt
        ? ` a partir de ${fmtDate(res.data.effectiveAt)}`
        : '';
      Alert.alert(
        'Downgrade agendado',
        `Você será migrado para ${downgradeTarget.name}${effectiveMsg}. Seu plano atual permanece ativo até lá.`,
        [{ text: 'OK', onPress: fetchPlans }],
      );
    } catch (err: any) {
      Alert.alert(
        'Erro',
        err?.response?.data?.message ??
          'Não foi possível processar o downgrade.',
      );
    } finally {
      setDowngradeLoading(false);
    }
  };

  const handleCancelDowngrade = () => {
    Alert.alert(
      'Cancelar downgrade',
      'Deseja manter seu plano atual e cancelar o downgrade agendado?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, manter plano atual',
          onPress: async () => {
            try {
              await api.delete('/subscriptions/downgrade');
              fetchPlans();
            } catch {
              Alert.alert('Erro', 'Não foi possível cancelar o downgrade.');
            }
          },
        },
      ],
    );
  };

  const currentPlanData = plans.find(p => p.type === currentPlan);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>Escolha seu plano</Text>
          <Text style={styles.headerSub}>
            Suporte dedicado para a sua jornada com GLP-1
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de downgrade agendado */}
        {scheduledDowngrade && (
          <View style={styles.downgradeBanner}>
            <View style={styles.downgradeBannerLeft}>
              <Text style={styles.downgradeBannerTitle}>
                ⚙ Downgrade agendado para{' '}
                <Text style={{ fontWeight: '800' }}>
                  {scheduledDowngrade.plan.name}
                </Text>
              </Text>
              {scheduledDowngrade.effectiveAt && (
                <Text style={styles.downgradeBannerSub}>
                  Efetivo em {fmtDate(scheduledDowngrade.effectiveAt)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleCancelDowngrade}>
              <Text style={styles.downgradeBannerCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            color="#16a34a"
            size="large"
            style={{ marginTop: 60 }}
          />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Não foi possível carregar os planos.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPlans}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map(plan => {
            const isCurrent = currentPlan === plan.type;
            const highlight = plan.type === HIGHLIGHT_TYPE;
            const isPremium = plan.type === 'PREMIUM';
            const isDowngradeTarget =
              scheduledDowngrade?.plan.type === plan.type;
            const isDowngrade =
              currentPlan &&
              (PLAN_HIERARCHY[plan.type] ?? 0) <
                (PLAN_HIERARCHY[currentPlan] ?? 0);

            return (
              <View
                key={plan.type}
                style={[
                  styles.card,
                  highlight && styles.cardHighlight,
                  isPremium && !highlight && styles.cardPremium,
                ]}
              >
                {highlight && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={12} color="#FBBF24" />
                    <Text style={styles.popularText}> Mais Popular</Text>
                  </View>
                )}

                <View style={styles.badgeRow}>
                  {isCurrent && (
                    <View
                      style={[
                        styles.currentBadge,
                        highlight && styles.currentBadgeHighlight,
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={highlight ? '#fff' : '#16a34a'}
                      />
                      <Text
                        style={[
                          styles.currentBadgeText,
                          highlight && styles.currentBadgeTextHighlight,
                        ]}
                      >
                        Seu plano atual
                      </Text>
                    </View>
                  )}
                  {isDowngradeTarget && (
                    <View style={styles.downgradePillBadge}>
                      <Text style={styles.downgradePillBadgeText}>
                        ⚙ Downgrade agendado
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.planName,
                    highlight && styles.planNameHighlight,
                  ]}
                >
                  {plan.name}
                </Text>

                <View style={styles.priceRow}>
                  <Text
                    style={[styles.price, highlight && styles.priceHighlight]}
                  >
                    {fmtPrice(plan.priceInCents)}
                  </Text>
                  <Text
                    style={[
                      styles.priceSub,
                      highlight && styles.priceSubHighlight,
                    ]}
                  >
                    /mês
                  </Text>
                </View>

                <View
                  style={[styles.divider, highlight && styles.dividerHighlight]}
                />

                <View style={styles.featureList}>
                  {plan.features.map(f => (
                    <View key={f} style={styles.featureRow}>
                      <View
                        style={[
                          styles.iconCheckbox,
                          highlight && styles.iconCheckboxHighlight,
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={highlight ? '#16a34a' : '#fff'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.featureText,
                          highlight && styles.featureTextHighlight,
                        ]}
                      >
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>

                {isCurrent ? (
                  <View
                    style={[
                      styles.activePill,
                      highlight && styles.activePillHighlight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.activePillText,
                        highlight && styles.activePillTextHighlight,
                      ]}
                    >
                      Plano ativo
                    </Text>
                  </View>
                ) : isDowngrade ? (
                  <TouchableOpacity
                    style={[
                      styles.btnDowngrade,
                      isDowngradeTarget && styles.btnDowngradeDisabled,
                    ]}
                    onPress={() => !scheduledDowngrade && handlePlanPress(plan)}
                    disabled={!!scheduledDowngrade}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.btnDowngradeText}>
                      {isDowngradeTarget
                        ? 'Downgrade agendado'
                        : 'Fazer downgrade'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, highlight && styles.btnHighlight]}
                    onPress={() => handlePlanPress(plan)}
                    activeOpacity={0.88}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        highlight && styles.btnTextHighlight,
                      ]}
                    >
                      {currentPlan ? 'Fazer upgrade' : 'Assinar agora'}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#fff"
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.disclaimer}>
          As orientações são educacionais e não substituem consulta médica.
          Cancele quando quiser.
        </Text>
      </ScrollView>

      {/* Bottom sheet de confirmação de downgrade */}
      <Modal
        visible={!!downgradeTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setDowngradeTarget(null)}
      >
        <View style={styles.sheetContainer}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !downgradeLoading && setDowngradeTarget(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Fazer downgrade para {downgradeTarget?.name}?
            </Text>
            <Text style={styles.sheetSub}>
              Você continuará com{' '}
              <Text style={{ fontWeight: '700' }}>
                {currentPlanData?.name ?? 'o plano atual'}
              </Text>{' '}
              até o fim do seu ciclo de cobrança. Após isso, o plano muda
              automaticamente.
            </Text>

            {/* O que você perde */}
            {currentPlanData && downgradeTarget && (
              <View style={styles.loseBox}>
                <Text style={styles.loseTitle}>O que você deixará de ter</Text>
                {currentPlanData.features
                  .filter(f => !downgradeTarget.features.includes(f))
                  .map(f => (
                    <View key={f} style={styles.loseRow}>
                      <Text style={styles.loseMark}>✕</Text>
                      <Text style={styles.loseText}>{f}</Text>
                    </View>
                  ))}
                {currentPlanData.features.filter(
                  f => !downgradeTarget.features.includes(f),
                ).length === 0 && (
                  <Text style={styles.loseText}>
                    Nenhuma feature exclusiva identificada.
                  </Text>
                )}
              </View>
            )}

            <View style={styles.sheetBtns}>
              <TouchableOpacity
                style={styles.sheetBtnCancel}
                onPress={() => setDowngradeTarget(null)}
                disabled={downgradeLoading}
              >
                <Text style={styles.sheetBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sheetBtnConfirm,
                  downgradeLoading && { opacity: 0.6 },
                ]}
                onPress={confirmDowngrade}
                disabled={downgradeLoading}
              >
                <Text style={styles.sheetBtnConfirmText}>
                  {downgradeLoading ? 'Aguarde...' : 'Confirmar downgrade'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },

  /* Cards */
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHighlight: {
    backgroundColor: '#111827',
    borderColor: '#111827',
    shadowColor: '#111827',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPremium: {
    borderColor: '#d1d5db',
    backgroundColor: '#fafafa',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 4,
  },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  popularText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  planNameHighlight: { color: '#fff' },
  planNamePremium: { color: '#1f2937' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 2,
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
    paddingBottom: 4,
  },
  currencyHighlight: { color: '#86efac' },
  currencyPremium: { color: '#d97706' },
  price: { fontSize: 36, fontWeight: '900', color: '#16a34a', lineHeight: 40 },
  priceHighlight: { color: '#fff' },
  pricePremium: { color: '#d97706' },
  priceSub: { fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 12 },
  priceSubHighlight: { color: 'rgba(255,255,255,0.6)' },
  period: { fontSize: 13, color: '#6b7280', paddingBottom: 6, marginLeft: 2 },
  periodHighlight: { color: 'rgba(255,255,255,0.6)' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },
  dividerHighlight: { backgroundColor: 'rgba(255,255,255,0.1)' },
  featureList: { gap: 8, marginBottom: 8 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCheckbox: { width: 20, alignItems: 'center' },
  iconCheckboxHighlight: {},
  featureText: { fontSize: 14, color: '#374151', flex: 1 },
  featureTextHighlight: { color: 'rgba(255,255,255,0.85)' },
  featureTextPremium: { color: '#4b5563' },
  currentBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  currentBadgeHighlight: { backgroundColor: 'rgba(255,255,255,0.15)' },
  currentBadgeText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  currentBadgeTextHighlight: { color: '#fff' },
  activePill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  activePillHighlight: { backgroundColor: 'rgba(255,255,255,0.15)' },
  activePillText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  activePillTextHighlight: { color: '#fff' },
  btn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnHighlight: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnTextHighlight: { color: '#fff' },

  /* Error */
  errorBox: { alignItems: 'center', marginTop: 60, gap: 12 },
  errorText: { color: '#6b7280', fontSize: 14 },
  retryBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  disclaimer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },

  /* Downgrade banner */
  downgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  downgradeBannerLeft: { flex: 1 },
  downgradeBannerTitle: { fontSize: 13, fontWeight: '600', color: '#92400e' },
  downgradeBannerSub: { fontSize: 11, color: '#b45309', marginTop: 2 },
  downgradeBannerCancel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    textDecorationLine: 'underline',
  },

  /* Badge row */
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  downgradePillBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  downgradePillBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400e' },

  /* Downgrade button */
  btnDowngrade: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDowngradeDisabled: { opacity: 0.5 },
  btnDowngradeText: { color: '#6b7280', fontSize: 15, fontWeight: '700' },

  /* Bottom sheet */
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  sheetSub: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },

  loseBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  loseTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  loseRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  loseMark: { fontSize: 13, color: '#dc2626', fontWeight: '700', marginTop: 1 },
  loseText: { fontSize: 13, color: '#dc2626', flex: 1 },

  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetBtnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetBtnCancelText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  sheetBtnConfirm: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetBtnConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
