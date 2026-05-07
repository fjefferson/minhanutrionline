import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { RootStackParamList } from '../../navigation/types';

interface PlanInfo {
  id: string;
  type: string;
  name: string;
  priceInCents: number;
}

interface SubscriptionMe {
  status: string;
  currentPeriodStart?: string | null;
  plan?: { type: string; name: string };
}

type Stage = 'confirm' | 'waiting' | 'success';
type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { planType: routePlanType } = route.params;

  const { hydrate } = useAuthStore();

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [allPlans, setAllPlans] = useState<PlanInfo[]>([]);
  const [currentSub, setCurrentSub] = useState<SubscriptionMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('confirm');
  const [cpf, setCpf] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUpgrade =
    currentSub?.status === 'ACTIVE' && currentSub.plan?.type !== routePlanType;

  // Proration client-side
  const proration = (() => {
    if (!isUpgrade || !currentSub?.currentPeriodStart || !plan) return null;
    const currentPlan = allPlans.find(p => p.type === currentSub.plan?.type);
    if (!currentPlan) return null;
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUsed = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(currentSub.currentPeriodStart).getTime()) /
          msPerDay,
      ),
    );
    const daysRemaining = Math.max(0, 30 - daysUsed);
    if (daysRemaining === 0) return null;
    const credit =
      Math.round(
        ((daysRemaining * currentPlan.priceInCents) / 100 / 30) * 100,
      ) / 100;
    const charge =
      Math.round(((daysRemaining * plan.priceInCents) / 100 / 30) * 100) / 100;
    const firstPayment = Math.max(
      0.01,
      Math.round((charge - credit) * 100) / 100,
    );
    return { daysRemaining, credit, charge, firstPayment };
  })();

  useEffect(() => {
    Promise.all([
      api.get<PlanInfo[]>('/plans'),
      api.get<SubscriptionMe | null>('/subscriptions/me').catch(() => ({
        data: null,
      })),
    ])
      .then(([plansRes, subRes]) => {
        setAllPlans(plansRes.data);
        const found = plansRes.data.find(
          (p: PlanInfo) => p.type === routePlanType,
        );
        if (!found) {
          navigation.replace('Plans');
          return;
        }
        setPlan(found);
        setCurrentSub(subRes.data);
      })
      .catch(() => {
        Alert.alert('Erro', 'Não foi possível carregar o plano.');
        navigation.goBack();
      })
      .finally(() => setLoading(false));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<SubscriptionMe | null>('/subscriptions/me');
        if (res.data?.status === 'ACTIVE') {
          clearInterval(pollRef.current!);
          await hydrate();
          setStage('success');
          setTimeout(() => {
            navigation.navigate('Main');
          }, 2500);
        }
      } catch {
        /* ignora erros de polling */
      }
    }, 3000);
  };

  const handleCheckout = async () => {
    const rawCpf = cpf.replace(/\D/g, '');
    if (rawCpf.length !== 11) {
      setError('Informe um CPF válido (11 dígitos).');
      return;
    }
    setPaying(true);
    setError('');
    try {
      const endpoint = isUpgrade
        ? '/subscriptions/upgrade'
        : '/subscriptions/checkout';
      const res = await api.post(endpoint, {
        planType: routePlanType,
        cpfCnpj: rawCpf,
      });
      const url: string = res.data?.init_point ?? res.data?.paymentUrl ?? '';
      if (!url) {
        setError('Link de pagamento não retornado. Tente novamente.');
        return;
      }
      try {
        await Linking.openURL(url);
      } catch {
        setError('Não foi possível abrir o link de pagamento.');
        return;
      }
      setStage('waiting');
      startPolling();
    } catch {
      setError('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setPaying(false);
    }
  };

  const fmtBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading || !plan) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.header}>
        {stage === 'confirm' && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {isUpgrade ? 'Confirmar upgrade' : 'Confirmar assinatura'}
        </Text>
        <Text style={styles.headerSub}>
          Você será redirecionado para a página de pagamento
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── CONFIRM ── */}
        {stage === 'confirm' && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryPlanName}>{plan.name}</Text>

              {proration ? (
                <>
                  <Text style={styles.summaryPrice}>
                    {fmtBRL(proration.firstPayment)}
                    <Text style={styles.summaryPriceSub}> hoje</Text>
                  </Text>
                  <View style={styles.prorationTable}>
                    <View style={styles.prorationRow}>
                      <Text style={styles.prorationLabel}>
                        Dias restantes no ciclo
                      </Text>
                      <Text style={styles.prorationValue}>
                        {proration.daysRemaining} dias
                      </Text>
                    </View>
                    <View style={styles.prorationRow}>
                      <Text style={styles.prorationLabel}>
                        Crédito do plano atual
                      </Text>
                      <Text style={[styles.prorationValue, styles.credit]}>
                        − {fmtBRL(proration.credit)}
                      </Text>
                    </View>
                    <View style={styles.prorationRow}>
                      <Text style={styles.prorationLabel}>
                        Novo plano ({proration.daysRemaining} dias)
                      </Text>
                      <Text style={styles.prorationValue}>
                        {fmtBRL(proration.charge)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.prorationNote}>
                    A partir do 2º mês: {fmtBRL(plan.priceInCents / 100)}/mês
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.summaryPrice}>
                    {fmtBRL(plan.priceInCents / 100)}
                    <Text style={styles.summaryPriceSub}>/mês</Text>
                  </Text>
                  <Text style={styles.recurringNote}>
                    Cobrança recorrente mensal · Cancele quando quiser
                  </Text>
                </>
              )}
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* CPF */}
            <View style={styles.cpfField}>
              <Text style={styles.cpfLabel}>CPF</Text>
              <TextInput
                style={styles.cpfInput}
                placeholder="000.000.000-00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={14}
                value={cpf}
                onChangeText={v => {
                  const digits = v.replace(/\D/g, '').slice(0, 11);
                  let masked = digits;
                  if (digits.length > 9)
                    masked = digits.replace(
                      /(\d{3})(\d{3})(\d{3})(\d{2})/,
                      '$1.$2.$3-$4',
                    );
                  else if (digits.length > 6)
                    masked = digits.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
                  else if (digits.length > 3)
                    masked = digits.replace(/(\d{3})(\d+)/, '$1.$2');
                  setCpf(masked);
                  setError('');
                }}
              />
            </View>

            <TouchableOpacity
              style={[styles.payBtn, paying && styles.payBtnDisabled]}
              onPress={handleCheckout}
              disabled={paying}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#16a34a', '#15803d']}
                style={styles.payBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={20} color="#fff" />
                    <Text style={styles.payBtnText}>Assinar agora</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelLinkText}>Voltar para planos</Text>
            </TouchableOpacity>

            <Text style={styles.secureNote}>🔒 Pagamento 100% seguro</Text>
          </>
        )}

        {/* ── WAITING ── */}
        {stage === 'waiting' && (
          <View style={styles.centeredStage}>
            <ActivityIndicator
              color="#16a34a"
              size="large"
              style={{ marginBottom: 24 }}
            />
            <Text style={styles.stageTitle}>Aguardando pagamento</Text>
            <Text style={styles.stageBody}>
              Conclua o pagamento no navegador. Esta tela será atualizada
              automaticamente assim que confirmarmos.
            </Text>
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => {
                if (pollRef.current) clearInterval(pollRef.current);
                setStage('confirm');
              }}
            >
              <Text style={styles.cancelLinkText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SUCCESS ── */}
        {stage === 'success' && (
          <View style={styles.centeredStage}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={36} color="#16a34a" />
            </View>
            <Text style={styles.stageTitle}>Pagamento confirmado!</Text>
            <Text style={styles.stageBody}>
              Sua assinatura está ativa. Redirecionando…
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#bbf7d0', fontSize: 13, marginTop: 4 },

  body: { flex: 1, padding: 20 },

  /* Summary card */
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryPlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: 4,
  },
  summaryPriceSub: { fontSize: 14, fontWeight: '400', color: '#6b7280' },
  recurringNote: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  /* Proration */
  prorationTable: {
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
    marginTop: 12,
    paddingTop: 12,
    gap: 6,
  },
  prorationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prorationLabel: { fontSize: 13, color: '#6b7280' },
  prorationValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  credit: { color: '#16a34a' },
  prorationNote: { fontSize: 12, color: '#9ca3af', marginTop: 8 },

  /* Buttons */
  payBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  cancelLink: { alignItems: 'center', paddingVertical: 12 },
  cancelLinkText: { color: '#6b7280', fontSize: 14 },
  secureNote: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 8,
  },

  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },

  /* CPF field */
  cpfField: { marginBottom: 16 },
  cpfLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  cpfInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#111827',
  },

  /* Waiting / Success */
  centeredStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  stageBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 24,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
