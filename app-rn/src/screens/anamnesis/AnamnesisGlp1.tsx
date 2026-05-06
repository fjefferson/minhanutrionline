import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnamnesisStackParamList } from '../../navigation/types';
import api from '../../lib/api';
import { ProgressBar, Label, NavButtons } from './AnamnesisPersonal';

type Props = {
  navigation: NativeStackNavigationProp<
    AnamnesisStackParamList,
    'AnamnesisGlp1'
  >;
};

type Goal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE' | 'CONTROL_GLYCEMIA';
type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'INTENSE';
type DietType = 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN';

const GOALS: { value: Goal; label: string; icon: string; desc: string }[] = [
  {
    value: 'LOSE_WEIGHT',
    label: 'Emagrecer',
    icon: 'trending-down',
    desc: 'Reduzir peso com saúde',
  },
  {
    value: 'MAINTAIN',
    label: 'Manter peso',
    icon: 'remove',
    desc: 'Estabilizar o resultado',
  },
  {
    value: 'GAIN_MUSCLE',
    label: 'Ganhar músculo',
    icon: 'barbell',
    desc: 'Fortalecer o corpo',
  },
  {
    value: 'CONTROL_GLYCEMIA',
    label: 'Controlar glicemia',
    icon: 'pulse',
    desc: 'Foco metabólico',
  },
];

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string }[] = [
  {
    value: 'SEDENTARY',
    label: 'Sedentária',
    desc: 'Pouco ou nenhum exercício',
  },
  { value: 'LIGHT', label: 'Levemente ativa', desc: '1–2x por semana' },
  { value: 'MODERATE', label: 'Moderadamente ativa', desc: '3–4x por semana' },
  { value: 'INTENSE', label: 'Muito ativa', desc: '5x ou mais por semana' },
];

const DIETS: { value: DietType; label: string; desc: string }[] = [
  {
    value: 'OMNIVORE',
    label: 'Onívora',
    desc: 'Come de tudo, incluindo carnes',
  },
  {
    value: 'VEGETARIAN',
    label: 'Vegetariana',
    desc: 'Sem carnes; inclui ovos e laticínios',
  },
  { value: 'VEGAN', label: 'Vegana', desc: 'Sem nenhum produto animal' },
];

const GLP1_MEDS = [
  'Ozempic',
  'Wegovy',
  'Mounjaro',
  'Saxenda',
  'Rybelsus',
  'Outro',
];

export default function AnamnesisGlp1({ navigation }: Props) {
  const [medication, setMedication] = useState('');
  const [startDate, setStartDate] = useState('');
  const [goal, setGoal] = useState<Goal | ''>('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
  const [dietType, setDietType] = useState<DietType | ''>('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      await api.put('/profile/nutritional', {
        glp1Medication: medication || undefined,
        glp1StartDate: startDate ? toIsoDate(startDate) : undefined,
        goal: goal || undefined,
        activityLevel: activityLevel || undefined,
        dietType: dietType || undefined,
      });
    } catch {
      // não bloqueia
    } finally {
      setSaving(false);
      navigation.navigate('AnamnesisHealth');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProgressBar step={2} total={3} />
        <Text style={styles.title}>Tratamento e objetivos</Text>
        <Text style={styles.sub}>Sobre seu uso de GLP-1 e metas de saúde</Text>

        {/* Medicamento */}
        <Label text="Medicamento GLP-1 em uso" />
        <View style={styles.chipWrap}>
          {GLP1_MEDS.map(med => (
            <TouchableOpacity
              key={med}
              style={[styles.chip, medication === med && styles.chipActive]}
              onPress={() => setMedication(medication === med ? '' : med)}
            >
              <Text
                style={[
                  styles.chipText,
                  medication === med && styles.chipTextActive,
                ]}
              >
                {med}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Data de início */}
        <Label text="Data de início do tratamento" />
        <View style={styles.inputWrapper}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color="#9ca3af"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#9ca3af"
            value={startDate}
            onChangeText={v => setStartDate(maskDate(v))}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Objetivo */}
        <Label text="Objetivo principal" />
        <View style={styles.cardGrid}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[styles.optCard, goal === g.value && styles.optCardActive]}
              onPress={() => setGoal(g.value)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={g.icon as any}
                size={22}
                color={goal === g.value ? '#16a34a' : '#9ca3af'}
              />
              <Text
                style={[
                  styles.optLabel,
                  goal === g.value && styles.optLabelActive,
                ]}
              >
                {g.label}
              </Text>
              <Text style={styles.optDesc}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nível de atividade */}
        <Label text="Nível de atividade física" />
        {ACTIVITIES.map(a => (
          <TouchableOpacity
            key={a.value}
            style={[
              styles.listRow,
              activityLevel === a.value && styles.listRowActive,
            ]}
            onPress={() => setActivityLevel(a.value)}
          >
            <View
              style={[
                styles.radio,
                activityLevel === a.value && styles.radioActive,
              ]}
            >
              {activityLevel === a.value && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text
                style={[
                  styles.listLabel,
                  activityLevel === a.value && styles.listLabelActive,
                ]}
              >
                {a.label}
              </Text>
              <Text style={styles.listDesc}>{a.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Tipo de alimentação */}
        <Label text="Tipo de alimentação" />
        {DIETS.map(d => (
          <TouchableOpacity
            key={d.value}
            style={[
              styles.listRow,
              dietType === d.value && styles.listRowActive,
            ]}
            onPress={() => setDietType(d.value)}
          >
            <View
              style={[styles.radio, dietType === d.value && styles.radioActive]}
            >
              {dietType === d.value && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text
                style={[
                  styles.listLabel,
                  dietType === d.value && styles.listLabelActive,
                ]}
              >
                {d.label}
              </Text>
              <Text style={styles.listDesc}>{d.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <NavButtons
          onBack={() => navigation.goBack()}
          onNext={handleNext}
          loading={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 4,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },

  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  optCard: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 4,
    alignItems: 'flex-start',
  },
  optCardActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  optLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  optLabelActive: { color: '#16a34a' },
  optDesc: { fontSize: 11, color: '#9ca3af', lineHeight: 16 },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  listRowActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#16a34a' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16a34a',
  },
  listLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  listLabelActive: { color: '#16a34a' },
  listDesc: { fontSize: 12, color: '#9ca3af' },
});
