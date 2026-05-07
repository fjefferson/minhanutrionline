import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

interface Props {
  /** Icon to show (Ionicons name) */
  icon?: string;
  /** Feature title */
  featureName: string;
  /** Short description */
  description: string;
  /** Which plan(s) unlock this feature */
  requiredPlan: string;
  /** Gradient colors for the header */
  headerColors?: [string, string];
}

export default function PlanLock({
  icon = 'lock-closed',
  featureName,
  description,
  requiredPlan,
  headerColors = ['#16a34a', '#15803d'],
}: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <LinearGradient colors={headerColors} style={styles.header}>
        <Text style={styles.headerTitle}>{featureName}</Text>
        <Text style={styles.headerSub}>Recurso exclusivo</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={40} color="#16a34a" />
        </View>

        <Text style={styles.title}>Plano necessário</Text>
        <Text style={styles.desc}>{description}</Text>

        <View style={styles.badge}>
          <Ionicons name="star" size={14} color="#16a34a" />
          <Text style={styles.badgeText}>{requiredPlan}</Text>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('Plans' as never)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#16a34a', '#15803d']}
            style={styles.btnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Ver planos</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 28,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#15803d' },

  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 280,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
