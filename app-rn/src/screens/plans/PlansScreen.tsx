import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HIGHLIGHT_TYPE = 'PLUS';

export default function PlansScreen() {
  const navigation = useNavigation<Nav>();
  const { planType } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState<string | null>(planType());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        <Text style={styles.headerTitle}>Escolha seu plano</Text>
        <Text style={styles.headerSub}>
          Suporte dedicado para a sua jornada com GLP-1
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
          plans.map((plan, index) => {
            const isCurrent = currentPlan === plan.type;
            const highlight = plan.type === HIGHLIGHT_TYPE;
            const isPremium = plan.type === 'PREMIUM';

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

                {/* Separador customizado */}
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
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, highlight && styles.btnHighlight]}
                    onPress={() =>
                      navigation.navigate('Checkout', { planType: plan.type })
                    }
                    activeOpacity={0.88}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        highlight && styles.btnTextHighlight,
                      ]}
                    >
                      {currentPlan ? 'Mudar para este plano' : 'Assinar agora'}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={highlight ? '#fff' : '#fff'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
  },
  backBtn: {
    padding: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
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
    backgroundColor: '#111827', // Dark/Almost Black
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
  },
  popularText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  currentBadgeHighlight: { backgroundColor: 'rgba(255,255,255,0.15)' },
  currentBadgeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '700',
  },
  currentBadgeTextHighlight: { color: '#fff' },

  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  planNameHighlight: { color: '#fff' },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  price: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },
  priceHighlight: { color: '#fff' },
  priceSub: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '600',
  },
  priceSubHighlight: { color: '#9ca3af' },

  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 20,
  },
  dividerHighlight: {
    backgroundColor: '#374151',
  },

  featureList: { marginBottom: 28, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCheckboxHighlight: {
    backgroundColor: '#fff',
  },
  featureText: { fontSize: 15, color: '#374151', flex: 1, fontWeight: '500' },
  featureTextHighlight: { color: '#e5e7eb' },

  activePill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activePillHighlight: { backgroundColor: '#374151' },
  activePillText: { color: '#9ca3af', fontSize: 16, fontWeight: '700' },
  activePillTextHighlight: { color: '#9ca3af' },

  btn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnHighlight: {
    backgroundColor: '#2563EB', // Royal Blue
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
});
