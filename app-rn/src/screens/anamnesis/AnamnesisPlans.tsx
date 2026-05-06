import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnamnesisStackParamList } from '../../navigation/types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type Props = {
  navigation: NativeStackNavigationProp<
    AnamnesisStackParamList,
    'AnamnesisPlans'
  >;
};

type Plan = {
  id: string;
  type: string;
  name: string;
  priceInCents: number;
  features: string[];
  active: boolean;
};

type Subscription = {
  status: string;
  plan?: { type: string };
};

const formatPrice = (cents: number) => {
  if (cents === 0) return 'Grátis';
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
};

export default function AnamnesisPlans({ navigation }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const { setOnboardingDone } = useAuthStore();

  useEffect(() => {
    Promise.all([
      api.get('/plans').catch(() => ({ data: [] })),
      api.get('/subscriptions/me').catch(() => ({ data: null })),
    ])
      .then(([plansRes, subRes]) => {
        setPlans((plansRes.data || []).filter((p: Plan) => p.active));
        setSubscription(subRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.post('/auth/onboarding-done');
      setOnboardingDone();
    } catch {
      // mesmo com erro, finaliza o onboarding localmente
      setOnboardingDone();
    }
  };

  const currentPlanType =
    subscription?.status === 'ACTIVE' ? subscription.plan?.type : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Escolha seu plano</Text>
        <Text style={styles.sub}>
          Acesse o suporte nutricional personalizado para sua jornada com GLP-1
        </Text>
      </View>

      {/* Planos */}
      {plans.map(plan => {
        const isPlus = plan.type === 'PLUS';
        const isCurrent = plan.type === currentPlanType;

        return (
          <View key={plan.id} style={[styles.card, isPlus && styles.cardPlus]}>
            {/* Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                {isPlus && (
                  <View style={styles.badgePlus}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.badgePlusText}>RECOMENDADO</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={styles.badgeCurrent}>
                    <Text style={styles.badgeCurrentText}>Plano atual</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.planName, isPlus && styles.planNamePlus]}>
                {plan.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, isPlus && styles.pricePlus]}>
                  {formatPrice(plan.priceInCents)}
                </Text>
                {plan.priceInCents > 0 && (
                  <Text style={styles.pricePeriod}>/mês</Text>
                )}
              </View>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={isPlus ? '#16a34a' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      isPlus && styles.featureTextPlus,
                    ]}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>

            {/* Botão do plano */}
            {!isCurrent && (
              <TouchableOpacity
                style={[
                  styles.planBtn,
                  isPlus ? styles.planBtnPlus : styles.planBtnFree,
                ]}
                onPress={handleFinish}
                disabled={finishing}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.planBtnText,
                    !isPlus && styles.planBtnTextFree,
                  ]}
                >
                  {finishing
                    ? 'Entrando...'
                    : plan.priceInCents === 0
                    ? 'Continuar grátis'
                    : 'Assinar agora'}
                </Text>
                {!finishing && (
                  <Ionicons
                    name={plan.priceInCents === 0 ? 'arrow-forward' : 'card'}
                    size={16}
                    color={isPlus ? '#fff' : '#16a34a'}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Card do plano gratuito — sempre exibido */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {!currentPlanType && (
              <View style={styles.badgeCurrent}>
                <Text style={styles.badgeCurrentText}>Plano atual</Text>
              </View>
            )}
          </View>
          <Text style={styles.planName}>Gratuito</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>R$ 0</Text>
          </View>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#6b7280" />
            <Text style={styles.featureText}>
              3 orientações de sintomas com IA
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#6b7280" />
            <Text style={styles.featureText}>Acesso ao conteúdo educativo</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="close-circle" size={16} color="#d1d5db" />
            <Text style={[styles.featureText, styles.featureDisabled]}>
              Chat com a nutricionista
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="close-circle" size={16} color="#d1d5db" />
            <Text style={[styles.featureText, styles.featureDisabled]}>
              Cardápio personalizado
            </Text>
          </View>
        </View>

        {!!currentPlanType && (
          <View style={styles.alreadyPaidNote}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#9ca3af"
            />
            <Text style={styles.alreadyPaidText}>
              Você já possui um plano pago ativo
            </Text>
          </View>
        )}

        {!currentPlanType && (
          <TouchableOpacity
            style={[styles.planBtn, styles.planBtnFree]}
            onPress={handleFinish}
            disabled={finishing}
            activeOpacity={0.85}
          >
            <Text style={[styles.planBtnText, styles.planBtnTextFree]}>
              {finishing ? 'Entrando...' : 'Continuar grátis'}
            </Text>
            {!finishing && (
              <Ionicons name="arrow-forward" size={16} color="#16a34a" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Nota de segurança */}
      <View style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#9ca3af" />
        <Text style={styles.noteText}>
          Pagamentos processados com segurança. Cancele quando quiser.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scroll: { backgroundColor: '#f9fafb', paddingBottom: 24 },

  header: {
    backgroundColor: '#16a34a',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#bbf7d0', lineHeight: 20 },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardPlus: {
    borderColor: '#16a34a',
    borderWidth: 2,
    elevation: 4,
    shadowOpacity: 0.12,
  },

  cardHeader: { marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },

  badgePlus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgePlusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  badgeCurrent: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeCurrentText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },

  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  planNamePlus: { color: '#16a34a' },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 28, fontWeight: '800', color: '#374151' },
  pricePlus: { color: '#16a34a' },
  pricePeriod: { fontSize: 14, color: '#9ca3af' },

  features: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#6b7280', flex: 1 },
  featureTextPlus: { color: '#374151' },
  featureDisabled: { color: '#d1d5db', textDecorationLine: 'line-through' },

  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  planBtnPlus: { backgroundColor: '#16a34a' },
  planBtnFree: {
    borderWidth: 1.5,
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  planBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  planBtnTextFree: { color: '#16a34a' },

  alreadyPaidNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  alreadyPaidText: { fontSize: 12, color: '#9ca3af', flex: 1 },

  skipBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: { fontSize: 14, color: '#9ca3af', textDecorationLine: 'underline' },

  note: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, color: '#9ca3af', lineHeight: 18 },
});
