import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

/* ─── Types ─────────────────────────────────────────────── */
type Gender = 'FEMALE' | 'MALE' | 'OTHER';
type Goal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE' | 'CONTROL_GLYCEMIA';
type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'INTENSE';
type DietType = 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN';

interface ProfileForm {
  gender: Gender | '';
  birthDate: string;
  heightCm: string;
  weightKg: string;
  occupation: string;
  goal: Goal | '';
  activityLevel: ActivityLevel | '';
  dietType: DietType | '';
  mealFrequency: string;
  foodDislikes: string;
  glp1Medication: string;
  glp1StartDate: string;
  allergies: string;
  intolerances: string;
  medicalConditions: string;
  otherMedications: string;
}

const EMPTY_FORM: ProfileForm = {
  gender: '',
  birthDate: '',
  heightCm: '',
  weightKg: '',
  occupation: '',
  goal: '',
  activityLevel: '',
  dietType: '',
  mealFrequency: '',
  foodDislikes: '',
  glp1Medication: '',
  glp1StartDate: '',
  allergies: '',
  intolerances: '',
  medicalConditions: '',
  otherMedications: '',
};

/* ─── Label maps ─────────────────────────────────────────── */
const GENDERS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Outro' },
];
const GOALS: { value: Goal; label: string }[] = [
  { value: 'LOSE_WEIGHT', label: 'Emagrecer' },
  { value: 'MAINTAIN', label: 'Manter peso' },
  { value: 'GAIN_MUSCLE', label: 'Ganhar músculo' },
  { value: 'CONTROL_GLYCEMIA', label: 'Controlar glicemia' },
];
const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
  { value: 'SEDENTARY', label: 'Sedentária' },
  { value: 'LIGHT', label: 'Levemente ativa' },
  { value: 'MODERATE', label: 'Moderada' },
  { value: 'INTENSE', label: 'Muito ativa' },
];
const DIETS: { value: DietType; label: string }[] = [
  { value: 'OMNIVORE', label: 'Onívora' },
  { value: 'VEGETARIAN', label: 'Vegetariana' },
  { value: 'VEGAN', label: 'Vegana' },
];

/* ─── Date mask ──────────────────────────────────────────── */
function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function toIsoDate(br: string): string | undefined {
  const parts = br.split('/');
  if (parts.length !== 3 || parts[2].length < 4) return undefined;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
function toBrDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/* ─── Small helpers ──────────────────────────────────────── */
function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}
function ChipGroup<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T | '';
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, value === o.value && styles.chipActive]}
          onPress={() => onSelect(o.value)}
        >
          <Text
            style={[
              styles.chipText,
              value === o.value && styles.chipTextActive,
            ]}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Main Screen ────────────────────────────────────────── */
type TabFlag = 'menu' | 'personalData' | 'accountSettings' | 'deleteAccount';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabFlag>('menu');

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Conta: nome ──────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // ── Conta: avatar ────────────────────────────────────────
  const [avatarLoading, setAvatarLoading] = useState(false);

  // ── Conta: senha ─────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // ── Conta: excluir ───────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const set = (field: keyof ProfileForm) => (val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/profile/nutritional');
      if (!data) return;
      setForm({
        gender: data.gender ?? '',
        birthDate: toBrDate(data.birthDate),
        heightCm: data.heightCm ? String(data.heightCm) : '',
        weightKg: data.weightKg ? String(data.weightKg) : '',
        occupation: data.occupation ?? '',
        goal: data.goal ?? '',
        activityLevel: data.activityLevel ?? '',
        dietType: data.dietType ?? '',
        mealFrequency: data.mealFrequency ? String(data.mealFrequency) : '',
        foodDislikes: data.foodDislikes ?? '',
        glp1Medication: data.glp1Medication ?? '',
        glp1StartDate: toBrDate(data.glp1StartDate),
        allergies: data.allergies ?? '',
        intolerances: data.intolerances ?? '',
        medicalConditions: data.medicalConditions ?? '',
        otherMedications: data.otherMedications ?? '',
      });
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profile/nutritional', {
        gender: form.gender || undefined,
        birthDate: toIsoDate(form.birthDate),
        heightCm: form.heightCm ? parseInt(form.heightCm) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        occupation: form.occupation || undefined,
        goal: form.goal || undefined,
        activityLevel: form.activityLevel || undefined,
        dietType: form.dietType || undefined,
        mealFrequency: form.mealFrequency
          ? parseInt(form.mealFrequency)
          : undefined,
        foodDislikes: form.foodDislikes || undefined,
        glp1Medication: form.glp1Medication || undefined,
        glp1StartDate: toIsoDate(form.glp1StartDate),
        allergies: form.allergies || undefined,
        intolerances: form.intolerances || undefined,
        medicalConditions: form.medicalConditions || undefined,
        otherMedications: form.otherMedications || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleNameSave = async () => {
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMsg(null);
    try {
      const { data } = await api.put('/auth/me', { name: name.trim() });
      await updateUser({ name: data.name });
      setNameMsg({ ok: true, text: 'Nome atualizado com sucesso!' });
    } catch (err: any) {
      setNameMsg({
        ok: false,
        text: err?.response?.data?.message ?? 'Erro ao atualizar nome.',
      });
    } finally {
      setNameSaving(false);
    }
  };

  const handleAvatar = async () => {
    try {
      // Solicita permissão em runtime no Android
      if (Platform.OS === 'android') {
        const permission =
          Number(Platform.Version) >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const already = await PermissionsAndroid.check(permission);
        if (!already) {
          const result = await PermissionsAndroid.request(permission, {
            title: 'Permissão de galeria',
            message:
              'Precisamos acessar sua galeria para alterar a foto de perfil.',
            buttonPositive: 'Permitir',
            buttonNegative: 'Cancelar',
          });
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permissão negada',
              'Acesse as configurações do dispositivo e permita o acesso à galeria.',
            );
            return;
          }
        }
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 512,
        maxHeight: 512,
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setAvatarLoading(true);
      const fd = new FormData();
      fd.append('avatar', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        name: asset.fileName ?? 'avatar.jpg',
      } as any);
      // transformRequest: evita que Axios serialize o FormData em JSON
      const { data } = await api.post('/auth/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: d => d,
      });
      await updateUser({ avatarUrl: data.avatarUrl });
      Alert.alert('Sucesso', 'Foto atualizada!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        'Não foi possível alterar a foto.';
      Alert.alert('Erro no upload', msg);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'As senhas não conferem.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({
        ok: false,
        text: 'A nova senha deve ter ao menos 6 caracteres.',
      });
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/auth/password', {
        ...(user?.hasPassword ? { currentPassword: currentPw } : {}),
        newPassword: newPw,
      });
      const successText = user?.hasPassword
        ? 'Senha alterada com sucesso!'
        : 'Senha definida com sucesso!';
      setPwMsg({ ok: true, text: successText });
      await updateUser({ hasPassword: true });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setPwMsg({
        ok: false,
        text: err?.response?.data?.message ?? 'Erro ao alterar senha.',
      });
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (user?.hasPassword && !deletePw) return;
    setDeleteLoading(true);
    try {
      await api.delete('/auth/me', {
        data: user?.hasPassword ? { password: deletePw } : undefined,
      });
      await logout();
    } catch (err: any) {
      Alert.alert(
        'Erro',
        err?.response?.data?.message ?? 'Não foi possível excluir a conta.',
      );
      setDeleteLoading(false);
    }
  };

  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  const renderMenu = () => (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => setActiveTab('personalData')}
      >
        <View style={styles.menuIconWrap}>
          <Ionicons name="document-text-outline" size={20} color="#2563EB" />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Dados do Perfil</Text>
          <Text style={styles.menuSubtitle}>
            Físicos, objetivos, saúde e dieta
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => setActiveTab('accountSettings')}
      >
        <View style={styles.menuIconWrap}>
          <Ionicons name="settings-outline" size={20} color="#2563EB" />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Configurações da Conta</Text>
          <Text style={styles.menuSubtitle}>Senha e nome de acesso</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuBtn, styles.menuBtnDanger]}
        onPress={() => setActiveTab('deleteAccount')}
      >
        <View style={[styles.menuIconWrap, styles.menuIconWrapDanger]}>
          <Ionicons name="trash-outline" size={20} color="#dc2626" />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={[styles.menuTitle, { color: '#dc2626' }]}>
            Excluir Conta
          </Text>
          <Text style={styles.menuSubtitle}>Esta ação é irreversível</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fca5a5" />
      </TouchableOpacity>

      {/* Logout on menu screen as well */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#4b5563" />
        <Text style={styles.logoutBtnText}>Sair do Aplicativo</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPersonalData = () => (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Dados físicos" />

      <Label text="Gênero" />
      <ChipGroup
        options={GENDERS}
        value={form.gender}
        onSelect={v => setForm(p => ({ ...p, gender: v }))}
      />

      <Label text="Data de nascimento" />
      <TextInput
        style={styles.input}
        value={form.birthDate}
        onChangeText={v => set('birthDate')(maskDate(v))}
        placeholder="DD/MM/AAAA"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        maxLength={10}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Label text="Altura (cm)" />
          <TextInput
            style={styles.input}
            value={form.heightCm}
            onChangeText={set('heightCm')}
            placeholder="ex: 165"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.half}>
          <Label text="Peso (kg)" />
          <TextInput
            style={styles.input}
            value={form.weightKg}
            onChangeText={set('weightKg')}
            placeholder="ex: 70.5"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Label text="Ocupação" />
      <TextInput
        style={styles.input}
        value={form.occupation}
        onChangeText={set('occupation')}
        placeholder="Ex: Analista, Professora..."
        placeholderTextColor="#9ca3af"
      />

      {/* ── Objetivos e hábitos ── */}
      <SectionHeader title="Objetivos e hábitos" />

      <Label text="Objetivo" />
      <ChipGroup
        options={GOALS}
        value={form.goal}
        onSelect={v => setForm(p => ({ ...p, goal: v }))}
      />

      <Label text="Nível de atividade" />
      <ChipGroup
        options={ACTIVITIES}
        value={form.activityLevel}
        onSelect={v => setForm(p => ({ ...p, activityLevel: v }))}
      />

      <Label text="Tipo de alimentação" />
      <ChipGroup
        options={DIETS}
        value={form.dietType}
        onSelect={v => setForm(p => ({ ...p, dietType: v }))}
      />

      <Label text="Refeições por dia" />
      <TextInput
        style={styles.input}
        value={form.mealFrequency}
        onChangeText={set('mealFrequency')}
        placeholder="ex: 5"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
      />

      <Label text="Alimentos que não gosta" />
      <TextInput
        style={styles.inputMulti}
        value={form.foodDislikes}
        onChangeText={set('foodDislikes')}
        placeholder="Ex: fígado, beterraba..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* ── GLP-1 ── */}
      <SectionHeader title="GLP-1" />

      <Label text="Medicamento em uso" />
      <TextInput
        style={styles.input}
        value={form.glp1Medication}
        onChangeText={set('glp1Medication')}
        placeholder="Ex: Ozempic, Wegovy..."
        placeholderTextColor="#9ca3af"
      />

      <Label text="Data de início do medicamento" />
      <TextInput
        style={styles.input}
        value={form.glp1StartDate}
        onChangeText={v => set('glp1StartDate')(maskDate(v))}
        placeholder="DD/MM/AAAA"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        maxLength={10}
      />

      {/* ── Saúde ── */}
      <SectionHeader title="Saúde" />

      <Label text="Alergias alimentares" />
      <TextInput
        style={styles.inputMulti}
        value={form.allergies}
        onChangeText={set('allergies')}
        placeholder="Ex: amendoim, frutos do mar..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      <Label text="Intolerâncias" />
      <TextInput
        style={styles.inputMulti}
        value={form.intolerances}
        onChangeText={set('intolerances')}
        placeholder="Ex: lactose, glúten..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      <Label text="Condições médicas" />
      <TextInput
        style={styles.inputMulti}
        value={form.medicalConditions}
        onChangeText={set('medicalConditions')}
        placeholder="Ex: diabetes tipo 2, hipertensão..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      <Label text="Outros medicamentos" />
      <TextInput
        style={styles.inputMulti}
        value={form.otherMedications}
        onChangeText={set('otherMedications')}
        placeholder="Ex: metformina 500mg..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      {/* ── Salvar perfil ── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : saved ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Salvo!</Text>
          </>
        ) : (
          <Text style={styles.saveBtnText}>Salvar perfil</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderAccountSettings = () => (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Nome de Exibição" />

      <View style={styles.accountCard}>
        <View style={styles.accountCardHeader}>
          <Ionicons name="person-outline" size={16} color="#16a34a" />
          <Text style={styles.accountCardTitle}>Nome</Text>
        </View>
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={name}
          onChangeText={setName}
          placeholder="Seu nome completo"
          placeholderTextColor="#9ca3af"
        />
        {nameMsg && (
          <View
            style={[
              styles.inlineMsg,
              nameMsg.ok ? styles.inlineMsgOk : styles.inlineMsgErr,
            ]}
          >
            <Ionicons
              name={nameMsg.ok ? 'checkmark-circle' : 'alert-circle'}
              size={14}
              color={nameMsg.ok ? '#15803d' : '#dc2626'}
            />
            <Text
              style={
                nameMsg.ok ? styles.inlineMsgTextOk : styles.inlineMsgTextErr
              }
            >
              {nameMsg.text}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.acctBtn, nameSaving && styles.saveBtnDisabled]}
          onPress={handleNameSave}
          disabled={nameSaving}
        >
          {nameSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.acctBtnText}>Salvar nome</Text>
          )}
        </TouchableOpacity>
      </View>

      <SectionHeader title="Segurança" />
      <View style={styles.accountCard}>
        <View style={styles.accountCardHeader}>
          <Ionicons name="lock-closed-outline" size={16} color="#16a34a" />
          <Text style={styles.accountCardTitle}>
            {user?.hasPassword ? 'Alterar senha' : 'Definir uma senha'}
          </Text>
        </View>
        {!user?.hasPassword && (
          <Text style={styles.googlePwNote}>
            Você entrou com o Google. Defina uma senha para também poder acessar
            com e-mail.
          </Text>
        )}
        {user?.hasPassword && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="Senha atual"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoComplete="current-password"
          />
        )}
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={newPw}
          onChangeText={setNewPw}
          placeholder="Nova senha (mín. 6 caracteres)"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          autoComplete="new-password"
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={confirmPw}
          onChangeText={setConfirmPw}
          placeholder="Confirmar nova senha"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          autoComplete="new-password"
        />
        {pwMsg && (
          <View
            style={[
              styles.inlineMsg,
              pwMsg.ok ? styles.inlineMsgOk : styles.inlineMsgErr,
            ]}
          >
            <Ionicons
              name={pwMsg.ok ? 'checkmark-circle' : 'alert-circle'}
              size={14}
              color={pwMsg.ok ? '#15803d' : '#dc2626'}
            />
            <Text
              style={
                pwMsg.ok ? styles.inlineMsgTextOk : styles.inlineMsgTextErr
              }
            >
              {pwMsg.text}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.acctBtn, pwSaving && styles.saveBtnDisabled]}
          onPress={handlePasswordChange}
          disabled={pwSaving}
        >
          {pwSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.acctBtnText}>
              {user?.hasPassword ? 'Alterar senha' : 'Definir senha'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDeleteAccount = () => (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.accountCard, styles.deleteCard, { marginTop: 24 }]}>
        <View style={styles.accountCardHeader}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={[styles.accountCardTitle, { color: '#dc2626' }]}>
            Excluir minha conta
          </Text>
        </View>
        <Text style={styles.deleteSubtitle}>
          Esta ação é irreversível. Todos os dados (perfil, histórico, consultas
          e assinatura) serão apagados conforme a LGPD.
        </Text>

        {!showDelete ? (
          <TouchableOpacity
            style={styles.deleteOpenBtn}
            onPress={() => setShowDelete(true)}
          >
            <Text style={styles.deleteOpenBtnText}>
              Solicitar exclusão de conta
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.deleteWarning}>
              <Ionicons name="warning" size={16} color="#b91c1c" />
              <Text style={styles.deleteWarningText}>
                <Text style={{ fontWeight: '700' }}>Atenção:</Text> esta ação é
                permanente.
              </Text>
            </View>
            {user?.hasPassword && (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={deletePw}
                onChangeText={setDeletePw}
                placeholder="Confirme sua senha"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoComplete="current-password"
              />
            )}
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmBtn,
                  deleteLoading && styles.saveBtnDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading || (!!user?.hasPassword && !deletePw)}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>
                    Excluir permanentemente
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => {
                  setShowDelete(false);
                  setDeletePw('');
                }}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );

  const TITLE_MAP: Record<TabFlag, string> = {
    menu: 'Menu',
    personalData: 'Dados do Perfil',
    accountSettings: 'Configurações',
    deleteAccount: 'Excluir Conta',
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {activeTab === 'menu' ? (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatar}
            disabled={avatarLoading}
            activeOpacity={0.85}
          >
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {avatarLoading ? (
                <ActivityIndicator color="#fff" size={10} />
              ) : (
                <Ionicons name="camera" size={12} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.headerName}>{user?.name}</Text>
          <Text style={styles.headerEmail}>{user?.email}</Text>
        </View>
      ) : (
        <View style={styles.secondaryHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setActiveTab('menu')}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.secondaryHeaderTitle}>
            {TITLE_MAP[activeTab]}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {activeTab === 'menu' && renderMenu()}
      {activeTab === 'personalData' && renderPersonalData()}
      {activeTab === 'accountSettings' && renderAccountSettings()}
      {activeTab === 'deleteAccount' && renderDeleteAccount()}
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#f3f4f6',
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#374151' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerEmail: { fontSize: 14, color: '#6b7280' },

  scroll: { padding: 20, paddingBottom: 110 },

  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  inputMulti: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
  },

  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#d1fae5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#15803d', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#2563EB', // Royal Blue
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // Pílula perfeita
    paddingVertical: 14,
    marginTop: 28,
    gap: 8,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Conta ────────────────────────────────────────────────
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  googlePwNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
  acctBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  acctBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  inlineMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  inlineMsgOk: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  inlineMsgErr: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  inlineMsgTextOk: { fontSize: 12, color: '#15803d', flex: 1 },
  inlineMsgTextErr: { fontSize: 12, color: '#dc2626', flex: 1 },

  // ── Excluir ──────────────────────────────────────────────
  deleteCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff',
  },
  deleteSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 18,
  },
  deleteOpenBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteOpenBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  deleteWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  deleteWarningText: {
    fontSize: 12,
    color: '#b91c1c',
    flex: 1,
    lineHeight: 18,
  },
  deleteActions: { flexDirection: 'column', gap: 10, marginTop: 12 },
  deleteConfirmBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteConfirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteCancelBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteCancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },

  // ── Navegação e Menu ─────────────────────────────────────
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  menuBtnDanger: {
    borderColor: '#fecaca',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconWrapDanger: {
    backgroundColor: '#fef2f2',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },

  secondaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  secondaryHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
});
