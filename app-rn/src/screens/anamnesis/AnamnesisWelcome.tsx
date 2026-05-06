import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnamnesisStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<
    AnamnesisStackParamList,
    'AnamnesisWelcome'
  >;
};

const STEPS = [
  {
    icon: 'person-circle',
    color: '#16a34a',
    title: 'Dados pessoais',
    desc: 'Peso, altura, gênero e ocupação',
  },
  {
    icon: 'medical',
    color: '#0ea5e9',
    title: 'Seu tratamento GLP-1',
    desc: 'Medicamento, início e objetivos',
  },
  {
    icon: 'heart',
    color: '#f59e0b',
    title: 'Histórico de saúde',
    desc: 'Alergias, condições e medicações',
  },
  {
    icon: 'star',
    color: '#8b5cf6',
    title: 'Escolha seu plano',
    desc: 'Acesso às ferramentas da plataforma',
  },
];

export default function AnamnesisWelcome({ navigation }: Props) {
  return (
    <LinearGradient colors={['#f0fdf4', '#dcfce7', '#fff']} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark-circle" size={44} color="#16a34a" />
          </View>
          <Text style={styles.title}>Conta criada com sucesso!</Text>
          <Text style={styles.sub}>
            Antes de começar, vamos conhecer você melhor. Leva menos de 2
            minutos.
          </Text>
        </View>

        {/* Steps preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>O que vamos configurar:</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIcon,
                  { backgroundColor: step.color + '18' },
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={20}
                  color={step.color}
                />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Nota */}
        <View style={styles.note}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#6b7280"
          />
          <Text style={styles.noteText}>
            Nenhuma informação é obrigatória. Preencha o que se sentir à vontade
            e atualize quando quiser.
          </Text>
        </View>

        {/* Botões */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('AnamnesisPersonal')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Vamos começar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('AnamnesisPlans')}
        >
          <Text style={styles.skipText}>Pular para os planos</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 28 },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    marginBottom: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stepDesc: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },

  note: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },

  btn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: 14 },
  skipText: { fontSize: 14, color: '#9ca3af' },
});
