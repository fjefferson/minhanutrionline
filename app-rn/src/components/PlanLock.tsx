import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
}: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{featureName}</Text>
        <Text style={styles.headerSub}>Recurso exclusivo</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={44} color="#2563EB" />
        </View>

        <Text style={styles.title}>Plano necessário</Text>
        <Text style={styles.desc}>{description}</Text>

        <View style={styles.badge}>
          <Ionicons name="star" size={14} color="#FBBF24" />
          <Text style={styles.badgeText}>{requiredPlan}</Text>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('Plans' as never)}
          activeOpacity={0.88}
        >
          <Text style={styles.btnText}>Ver planos</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  },
  headerSub: { fontSize: 16, color: '#6b7280', marginTop: 4 },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },

  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 36,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  btn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    width: '100%',
    maxWidth: 280,
    paddingVertical: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
