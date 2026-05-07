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
          plans.map(plan => {
            const isCurrent = currentPlan === plan.type;
            const highlight = plan.type === HIGHLIGHT_TYPE;
            return (
              <View
                key={plan.type}
                style={[styles.card, highlight && styles.cardHighlight]}
              >
                {highlight && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>⭐ Mais popular</Text>
                  </View>
                )}
                {isCurrent && (
                  <View
                    style={[
                      styles.currentBadge,
                      highlight && styles.currentBadgeHighlight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.currentBadgeText,
                        highlight && styles.currentBadgeTextHighlight,
                      ]}
                    >
                      Plano atual
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

                <View style={styles.featureList}>
                  {plan.features.map(f => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={highlight ? '#bbf7d0' : '#16a34a'}
                        style={{ marginTop: 1 }}
                      />
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
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        highlight && styles.btnTextHighlight,
                      ]}
                    >
                      {currentPlan ? 'Mudar para este plano' : 'Assinar agora'}
                    </Text>
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
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHighlight: {
    backgroundColor: '#1e40af', // Dark Royal Blue
    borderColor: '#1e40af',
  },
  popularBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  popularText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  currentBadge: {
    backgroundColor: '#f0fdf4',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  currentBadgeHighlight: { backgroundColor: 'rgba(255,255,255,0.2)' },
  currentBadgeText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadgeTextHighlight: { color: '#fff' },

  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  planNameHighlight: { color: '#fff' },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  priceHighlight: { color: '#fff' },
  priceSub: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
    marginLeft: 4,
  },
  priceSubHighlight: { color: '#bbf7d0' },

  featureList: { marginBottom: 24, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { fontSize: 14, color: '#4b5563', flex: 1, lineHeight: 20 },
  featureTextHighlight: { color: '#dcfce7' },

  activePill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 100, // Pílula perfeita
    paddingVertical: 14,
    alignItems: 'center',
  },
  activePillHighlight: { backgroundColor: 'rgba(255,255,255,0.2)' },
  activePillText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  activePillTextHighlight: { color: '#fff' },

  btn: {
    backgroundColor: '#2563EB', // Royal Blue
    borderRadius: 100, // Pílula perfeita
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnHighlight: { backgroundColor: '#fff', shadowColor: '#000' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnTextHighlight: { color: '#2563EB' },

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
