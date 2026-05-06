import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';
import type { MainTabParamList } from '../../navigation/types';

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
  CONTROL_GLYCEMIA: 'Controlar glicemia',
};

const ACTIVITY_LABEL: Record<string, string> = {
  SEDENTARY: 'Sedentária',
  LIGHT: 'Levemente ativa',
  MODERATE: 'Moderada',
  INTENSE: 'Muito ativa',
};

const DIET_LABEL: Record<string, string> = {
  OMNIVORE: 'Onívora',
  VEGETARIAN: 'Vegetariana',
  VEGAN: 'Vegana',
};

const QUICK_ACTIONS: {
  icon: string;
  label: string;
  route: keyof MainTabParamList;
  color: string;
}[] = [
  {
    icon: 'chatbubble-ellipses',
    label: 'Chat',
    route: 'Chat',
    color: '#16a34a',
  },
  { icon: 'flash', label: 'IA Nutri', route: 'Glp1', color: '#f59e0b' },
  { icon: 'library', label: 'Materiais', route: 'Materials', color: '#0ea5e9' },
  { icon: 'person', label: 'Perfil', route: 'Profile', color: '#8b5cf6' },
];

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? 'Paciente';

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

  return (
    <ScrollView
      style={styles.root}
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
      {/* Header */}
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreet}>Olá, {firstName} 👋</Text>
            <Text style={styles.headerSub}>Como você está hoje?</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        </View>

        {/* Medicamento badge */}
        {profile?.glp1Medication && (
          <View style={styles.medBadge}>
            <Ionicons name="medical" size={13} color="#16a34a" />
            <Text style={styles.medText}>{profile.glp1Medication}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(action.route)}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: action.color + '18' },
                ]}
              >
                <Ionicons
                  name={action.icon as any}
                  size={26}
                  color={action.color}
                />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info cards */}
      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seu perfil</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="flag" size={18} color="#16a34a" />
              <Text style={styles.infoLabel}>Objetivo</Text>
              <Text style={styles.infoValue}>
                {profile?.goal
                  ? GOAL_LABEL[profile.goal] ?? '—'
                  : 'Não informado'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="scale" size={18} color="#0ea5e9" />
              <Text style={styles.infoLabel}>Peso atual</Text>
              <Text style={styles.infoValue}>
                {profile?.weightKg ? `${profile.weightKg} kg` : 'Não informado'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="resize" size={18} color="#8b5cf6" />
              <Text style={styles.infoLabel}>Altura</Text>
              <Text style={styles.infoValue}>
                {profile?.heightCm ? `${profile.heightCm} cm` : 'Não informado'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="walk" size={18} color="#f59e0b" />
              <Text style={styles.infoLabel}>Atividade</Text>
              <Text style={styles.infoValue}>
                {profile?.activityLevel
                  ? ACTIVITY_LABEL[profile.activityLevel] ?? '—'
                  : 'Não informado'}
              </Text>
            </View>
          </View>
          {profile?.dietType && (
            <View style={styles.infoRow}>
              <Ionicons name="leaf" size={15} color="#16a34a" />
              <Text style={styles.infoRowLabel}>Alimentação:</Text>
              <Text style={styles.infoRowValue}>
                {DIET_LABEL[profile.dietType] ?? profile.dietType}
              </Text>
            </View>
          )}
          {profile?.occupation && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase" size={15} color="#6b7280" />
              <Text style={styles.infoRowLabel}>Ocupação:</Text>
              <Text style={styles.infoRowValue}>{profile.occupation}</Text>
            </View>
          )}
        </View>
      )}

      {/* CTA verificação de e-mail */}
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

      {/* Rodapé nutricionista */}
      <View style={styles.nutri}>
        <View style={styles.nutriAvatar}>
          <Text style={styles.nutriAvatarText}>E</Text>
        </View>
        <View>
          <Text style={styles.nutriName}>Elane Oliveira</Text>
          <Text style={styles.nutriCrn}>Nutricionista · CRN-14533</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },

  header: {
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerGreet: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  medText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    flex: 1,
    minWidth: '42%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#111827' },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginTop: 8,
  },
  infoRowLabel: { fontSize: 13, color: '#6b7280' },
  infoRowValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
  },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  alertSub: { fontSize: 12, color: '#a16207', marginTop: 2, lineHeight: 18 },

  nutri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  nutriAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  nutriName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  nutriCrn: { fontSize: 12, color: '#6b7280' },
});
