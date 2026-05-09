import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';
import type {
  MainTabParamList,
  RootStackParamList,
} from '../../navigation/types';

const NUTRI_AVATAR = require('../../assets/images/avatar_atendimento_elane_oliveira_nutri.jpg');

interface ProfileData {
  glp1Medication?: string | null;
  goal?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  activityLevel?: string | null;
  dietType?: string | null;
  occupation?: string | null;
  birthDate?: string | null;
}

const GOAL_LABEL: Record<string, string> = {
  LOSE_WEIGHT: 'Emagrecer',
  MAINTAIN: 'Manter peso',
  GAIN_MUSCLE: 'Ganhar músculo',
  CONTROL_GLYCEMIA: 'Glicemia',
};

const ACTIVITY_LABEL: Record<string, string> = {
  SEDENTARY: 'Sedentária',
  LIGHT: 'Leve',
  MODERATE: 'Moderada',
  INTENSE: 'Intensa',
};

const PLAN_COLOR: Record<string, [string, string]> = {
  BASIC: ['#0ea5e9', '#0284c7'],
  PLUS: ['#8b5cf6', '#7c3aed'],
  PREMIUM: ['#f59e0b', '#d97706'],
};

const PLAN_ICON: Record<string, string> = {
  BASIC: 'leaf',
  PLUS: 'star',
  PREMIUM: 'diamond',
};

export default function HomeScreen() {
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const rootNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, planType } = useAuthStore();
  const plan = planType();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/profile/nutritional');
      setProfile(data);
    } catch {
      // perfil ainda não preenchido
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const planColors: [string, string] = plan
    ? PLAN_COLOR[plan] ?? ['#16a34a', '#15803d']
    : ['#16a34a', '#059669'];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16a34a"
          />
        }
      >
        {/* ── Hero card — plano ─────────────────────── */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => rootNav.navigate('Plans')}
        >
          <LinearGradient
            colors={planColors}
            style={styles.heroGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroDeco1} />
            <View style={styles.heroDeco2} />
            <View style={styles.heroBody}>
              <View style={styles.heroLeft}>
                <View style={styles.heroIconWrap}>
                  <Ionicons
                    name={plan ? PLAN_ICON[plan] ?? 'star' : 'rocket-outline'}
                    size={26}
                    color="#fff"
                  />
                </View>
                <View>
                  <Text style={styles.heroLabel}>Plano atual</Text>
                  <Text style={styles.heroName}>
                    {plan
                      ? plan.charAt(0) + plan.slice(1).toLowerCase()
                      : 'Gratuito'}
                  </Text>
                  {profile?.glp1Medication ? (
                    <View style={styles.heroPill}>
                      <Ionicons
                        name="medical"
                        size={10}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.heroPillText}>
                        {profile.glp1Medication}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.heroRight}>
                <Text style={styles.heroCtaText}>
                  {plan ? 'Ver planos' : 'Assinar'}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Stats chips ───────────────────────────── */}
        {!loading && profile && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
            {!!profile.weightKg && (
              <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="scale-outline" size={17} color="#3b82f6" />
                </View>
                <Text style={styles.statValue}>
                  {profile.weightKg}
                  <Text style={styles.statUnit}> kg</Text>
                </Text>
                <Text style={styles.statLabel}>Peso</Text>
              </View>
            )}
            {!!profile.heightCm && (
              <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="resize-outline" size={17} color="#16a34a" />
                </View>
                <Text style={styles.statValue}>
                  {profile.heightCm}
                  <Text style={styles.statUnit}> cm</Text>
                </Text>
                <Text style={styles.statLabel}>Altura</Text>
              </View>
            )}
            {!!profile.weightKg && !!profile.heightCm && (
              <View style={[styles.statCard, { backgroundColor: '#fdf4ff' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons
                    name="analytics-outline"
                    size={17}
                    color="#a855f7"
                  />
                </View>
                <Text style={styles.statValue}>
                  {(
                    profile.weightKg / Math.pow(profile.heightCm / 100, 2)
                  ).toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>IMC</Text>
              </View>
            )}
            {!!profile.goal && (
              <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#ffedd5' }]}>
                  <Ionicons name="flag-outline" size={17} color="#f97316" />
                </View>
                <Text style={styles.statValue} numberOfLines={1}>
                  {GOAL_LABEL[profile.goal]?.split(' ')[0] ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Objetivo</Text>
              </View>
            )}
            {!!profile.activityLevel && (
              <View style={[styles.statCard, { backgroundColor: '#fefce8' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#fef08a' }]}>
                  <Ionicons name="walk-outline" size={17} color="#ca8a04" />
                </View>
                <Text style={styles.statValue} numberOfLines={1}>
                  {ACTIVITY_LABEL[profile.activityLevel] ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Atividade</Text>
              </View>
            )}
          </ScrollView>
        )}
        {loading && (
          <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} />
        )}

        {/* ── Feature cards ─────────────────────────── */}
        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.featureGrid}>
          {/* Chat — large */}
          <TouchableOpacity
            style={styles.featureLarge}
            activeOpacity={0.85}
            onPress={() => tabNav.navigate('Chat')}
          >
            <LinearGradient
              colors={['#16a34a', '#059669']}
              style={styles.featureGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureDeco} />
              <View style={styles.featureIconWrap}>
                <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
              </View>
              <Text style={styles.featureTitle}>Chat</Text>
              <Text style={styles.featureSub}>Fale com a nutricionista</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* IA Nutri — large */}
          <TouchableOpacity
            style={styles.featureLarge}
            activeOpacity={0.85}
            onPress={() => tabNav.navigate('Glp1')}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.featureGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureDeco} />
              <View style={styles.featureIconWrap}>
                <Ionicons name="flash" size={28} color="#fff" />
              </View>
              <Text style={styles.featureTitle}>IA Nutri</Text>
              <Text style={styles.featureSub}>Dúvidas com GLP-1</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Materiais — small */}
          <TouchableOpacity
            style={styles.featureSmall}
            activeOpacity={0.85}
            onPress={() => tabNav.navigate('Materials')}
          >
            <LinearGradient
              colors={['#0ea5e9', '#0284c7']}
              style={styles.featureGradSm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureIconWrapSm}>
                <Ionicons name="library" size={22} color="#fff" />
              </View>
              <Text style={styles.featureTitleSm}>Materiais</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Consultas — small */}
          <TouchableOpacity
            style={styles.featureSmall}
            activeOpacity={0.85}
            onPress={() => tabNav.navigate('Consultation')}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.featureGradSm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureIconWrapSm}>
                <Ionicons name="calendar" size={22} color="#fff" />
              </View>
              <Text style={styles.featureTitleSm}>Consultas</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Meu Progresso ─────────────────────────── */}
        <Text style={styles.sectionTitle}>Meu progresso</Text>
        <View style={styles.progressGrid}>
          <TouchableOpacity
            style={styles.progressCard}
            activeOpacity={0.85}
            onPress={() => rootNav.navigate('Dosage')}
          >
            <View style={[styles.progressIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="medical" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.progressCardTitle}>Doses GLP-1</Text>
            <Text style={styles.progressCardSub}>Histórico de doses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressCard}
            activeOpacity={0.85}
            onPress={() => rootNav.navigate('Progress')}
          >
            <View style={[styles.progressIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="trending-down" size={20} color="#16a34a" />
            </View>
            <Text style={styles.progressCardTitle}>Minha Evolução</Text>
            <Text style={styles.progressCardSub}>Peso e medidas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressCard}
            activeOpacity={0.85}
            onPress={() => rootNav.navigate('Reports')}
          >
            <View style={[styles.progressIcon, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="bar-chart" size={20} color="#f97316" />
            </View>
            <Text style={styles.progressCardTitle}>Relatórios</Text>
            <Text style={styles.progressCardSub}>Dados e evolução</Text>
          </TouchableOpacity>
        </View>

        {/* ── Email alert ─────────────────────────── */}
        {user && !user.emailVerified && (
          <View style={styles.alertCard}>
            <Ionicons name="mail-unread" size={20} color="#92400e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Confirme seu e-mail</Text>
              <Text style={styles.alertSub}>
                Verifique sua caixa de entrada para ativar sua conta.
              </Text>
            </View>
          </View>
        )}

        {/* ── Nutri card ────────────────────────────── */}
        <TouchableOpacity
          style={styles.nutriCard}
          activeOpacity={0.85}
          onPress={() => tabNav.navigate('Chat')}
        >
          <Image source={NUTRI_AVATAR} style={styles.nutriAvatar} />
          <View style={styles.nutriInfo}>
            <Text style={styles.nutriName}>Elane Oliveira</Text>
            <Text style={styles.nutriCrn}>Nutricionista · CRN-14533</Text>
            <View style={styles.nutriOnline}>
              <View style={styles.nutriDot} />
              <Text style={styles.nutriOnlineText}>Disponível</Text>
            </View>
          </View>
          <View style={styles.nutriCta}>
            <Text style={styles.nutriCtaText}>Conversar</Text>
            <Ionicons name="chevron-forward" size={16} color="#16a34a" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 110, paddingTop: 8 },

  /* Hero card */
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  heroGrad: { padding: 24, overflow: 'hidden' },
  heroDeco1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -50,
    right: -30,
  },
  heroDeco2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    right: 80,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  heroPillText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },

  /* Stats row */
  statsRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    minWidth: 88,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  statUnit: { fontSize: 11, fontWeight: '500', color: '#6b7280' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  /* Section title */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 20,
    marginBottom: 14,
    marginTop: 8,
  },

  /* Feature grid */
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureLarge: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  featureGrad: {
    padding: 20,
    minHeight: 150,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  featureDeco: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -30,
    right: -20,
  },
  featureIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  featureSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  featureSmall: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  featureGradSm: {
    padding: 18,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  featureIconWrapSm: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureTitleSm: { fontSize: 14, fontWeight: '800', color: '#fff' },

  /* Progress section */
  progressGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  progressCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCardTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  progressCardSub: { fontSize: 10, color: '#9ca3af', lineHeight: 14 },

  /* Alert */
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  alertSub: { fontSize: 12, color: '#a16207', marginTop: 2, lineHeight: 18 },

  /* Nutri card */
  nutriCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  nutriAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  nutriInfo: { flex: 1 },
  nutriName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  nutriCrn: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  nutriOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  nutriDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  nutriOnlineText: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  nutriCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nutriCtaText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
});
