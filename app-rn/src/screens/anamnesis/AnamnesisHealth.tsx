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
    'AnamnesisHealth'
  >;
};

const MEAL_FREQS = ['2', '3', '4', '5', '6'];

export default function AnamnesisHealth({ navigation }: Props) {
  const [allergies, setAllergies] = useState('');
  const [intolerances, setIntolerances] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [otherMedications, setOtherMedications] = useState('');
  const [mealFrequency, setMealFrequency] = useState('');
  const [foodDislikes, setFoodDislikes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      await api.put('/profile/nutritional', {
        allergies: allergies || undefined,
        intolerances: intolerances || undefined,
        medicalConditions: medicalConditions || undefined,
        otherMedications: otherMedications || undefined,
        mealFrequency: mealFrequency ? parseInt(mealFrequency) : undefined,
        foodDislikes: foodDislikes || undefined,
      });
    } catch {
      // não bloqueia
    } finally {
      setSaving(false);
      navigation.navigate('AnamnesisPlans');
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
        <ProgressBar step={3} total={3} />
        <Text style={styles.title}>Histórico de saúde</Text>
        <Text style={styles.sub}>
          Informações para personalizar seu cardápio e orientações
        </Text>

        {/* Alergias */}
        <Label text="Alergias alimentares" />
        <View style={styles.inputWrapper}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color="#9ca3af"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Ex: amendoim, frutos do mar..."
            placeholderTextColor="#9ca3af"
            value={allergies}
            onChangeText={setAllergies}
          />
        </View>

        {/* Intolerâncias */}
        <Label text="Intolerâncias" />
        <View style={styles.inputWrapper}>
          <Ionicons
            name="warning-outline"
            size={18}
            color="#9ca3af"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Ex: lactose, glúten..."
            placeholderTextColor="#9ca3af"
            value={intolerances}
            onChangeText={setIntolerances}
          />
        </View>

        {/* Condições médicas */}
        <Label text="Condições médicas" />
        <View
          style={[
            styles.inputWrapper,
            { height: 80, alignItems: 'flex-start', paddingVertical: 12 },
          ]}
        >
          <TextInput
            style={[styles.input, { textAlignVertical: 'top' }]}
            placeholder="Ex: diabetes tipo 2, hipotireoidismo..."
            placeholderTextColor="#9ca3af"
            multiline
            value={medicalConditions}
            onChangeText={setMedicalConditions}
          />
        </View>

        {/* Outros medicamentos */}
        <Label text="Outros medicamentos em uso" />
        <View
          style={[
            styles.inputWrapper,
            { height: 70, alignItems: 'flex-start', paddingVertical: 12 },
          ]}
        >
          <TextInput
            style={[styles.input, { textAlignVertical: 'top' }]}
            placeholder="Ex: metformina, levotiroxina..."
            placeholderTextColor="#9ca3af"
            multiline
            value={otherMedications}
            onChangeText={setOtherMedications}
          />
        </View>

        {/* Frequência de refeições */}
        <Label text="Quantas refeições por dia?" />
        <View style={styles.chipRow}>
          {MEAL_FREQS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, mealFrequency === f && styles.chipActive]}
              onPress={() => setMealFrequency(f)}
            >
              <Text
                style={[
                  styles.chipText,
                  mealFrequency === f && styles.chipTextActive,
                ]}
              >
                {f}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alimentos que não gosta */}
        <Label text="Alimentos que não gosta" />
        <View
          style={[
            styles.inputWrapper,
            { height: 70, alignItems: 'flex-start', paddingVertical: 12 },
          ]}
        >
          <TextInput
            style={[styles.input, { textAlignVertical: 'top' }]}
            placeholder="Ex: fígado, beterraba, chuchu..."
            placeholderTextColor="#9ca3af"
            multiline
            value={foodDislikes}
            onChangeText={setFoodDislikes}
          />
        </View>

        {/* Aviso de privacidade */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
          <Text style={styles.privacyText}>
            Suas informações são privadas e acessadas apenas pela nutricionista.
          </Text>
        </View>

        <NavButtons
          onBack={() => navigation.goBack()}
          onNext={handleNext}
          loading={saving}
          nextLabel="Ver planos"
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

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  chipTextActive: { color: '#fff' },

  privacyNote: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
  },
  privacyText: { flex: 1, fontSize: 12, color: '#9ca3af', lineHeight: 18 },
});
