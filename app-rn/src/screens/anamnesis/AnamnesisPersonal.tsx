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
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnamnesisStackParamList } from '../../navigation/types';
import api from '../../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<
    AnamnesisStackParamList,
    'AnamnesisPersonal'
  >;
};

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

/** Mascara a digitação: 01/05/2025 */
function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA → AAAA-MM-DD para envio à API */
function toIsoDate(br: string): string | undefined {
  const parts = br.split('/');
  if (parts.length !== 3 || parts[2].length < 4) return undefined;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

const GENDERS: { value: Gender; label: string; icon: string }[] = [
  { value: 'FEMALE', label: 'Feminino', icon: 'female' },
  { value: 'MALE', label: 'Masculino', icon: 'male' },
  { value: 'OTHER', label: 'Outro', icon: 'person' },
];

export default function AnamnesisPersonal({ navigation }: Props) {
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [occupation, setOccupation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      await api.put('/profile/nutritional', {
        gender: gender || undefined,
        birthDate: birthDate ? toIsoDate(birthDate) : undefined,
        heightCm: heightCm ? parseInt(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        occupation: occupation || undefined,
      });
    } catch {
      // não bloqueia o fluxo
    } finally {
      setSaving(false);
      navigation.navigate('AnamnesisGlp1');
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
        {/* Progress */}
        <ProgressBar step={1} total={3} />

        <Text style={styles.title}>Dados pessoais</Text>
        <Text style={styles.sub}>
          Ajuda a personalizar suas orientações nutricionais
        </Text>

        {/* Gênero */}
        <Label text="Gênero" />
        <View style={styles.chipRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[styles.chip, gender === g.value && styles.chipActive]}
              onPress={() => setGender(g.value)}
            >
              <Ionicons
                name={g.icon as any}
                size={16}
                color={gender === g.value ? '#fff' : '#6b7280'}
              />
              <Text
                style={[
                  styles.chipText,
                  gender === g.value && styles.chipTextActive,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Data de nascimento */}
        <Label text="Data de nascimento" />
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
            value={birthDate}
            onChangeText={v => setBirthDate(maskDate(v))}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Altura e peso em linha */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Label text="Altura (cm)" />
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                placeholder="170"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={heightCm}
                onChangeText={setHeightCm}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Label text="Peso (kg)" />
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                placeholder="70.5"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                value={weightKg}
                onChangeText={setWeightKg}
              />
            </View>
          </View>
        </View>

        {/* Ocupação */}
        <Label text="Ocupação / profissão" />
        <View style={styles.inputWrapper}>
          <Ionicons
            name="briefcase-outline"
            size={18}
            color="#9ca3af"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Ex: professora, enfermeira..."
            placeholderTextColor="#9ca3af"
            value={occupation}
            onChangeText={setOccupation}
          />
        </View>

        {/* Botão */}
        <NavButtons
          onBack={() => navigation.goBack()}
          onNext={handleNext}
          loading={saving}
          nextLabel="Próximo"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={pbStyles.root}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            pbStyles.bar,
            i < step ? pbStyles.barActive : pbStyles.barInactive,
          ]}
        />
      ))}
      <Text style={pbStyles.label}>
        {step}/{total}
      </Text>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 24,
  },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  barActive: { backgroundColor: '#16a34a' },
  barInactive: { backgroundColor: '#e5e7eb' },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
});

export function Label({ text }: { text: string }) {
  return <Text style={labelStyle}>{text}</Text>;
}
const labelStyle = StyleSheet.create({
  t: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
}).t;

export function NavButtons({
  onBack,
  onNext,
  loading,
  nextLabel = 'Próximo',
}: {
  onBack: () => void;
  onNext: () => void;
  loading?: boolean;
  nextLabel?: string;
}) {
  return (
    <View style={navStyles.row}>
      <TouchableOpacity style={navStyles.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={18} color="#374151" />
        <Text style={navStyles.backText}>Voltar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={navStyles.next}
        onPress={onNext}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={navStyles.nextText}>
          {loading ? 'Salvando...' : nextLabel}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const navStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 32 },
  back: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
  },
  backText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  next: {
    flex: 2,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },

  row: { flexDirection: 'row', gap: 12 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
});
