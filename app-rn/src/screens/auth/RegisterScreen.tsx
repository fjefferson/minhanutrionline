import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/auth.store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { register, loginWithGoogle, loading } = useAuthStore();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.googleDebug ??
        err?.message ??
        'Erro desconhecido';
      Alert.alert('Erro Google', msg);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Erro ao cadastrar. Tente novamente.';
      Alert.alert('Erro', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#f0fdf4', '#ffffff']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add" size={30} color="#16a34a" />
            </View>
            <Text style={styles.heading}>Criar conta</Text>
            <Text style={styles.sub}>
              Comece seu acompanhamento gratuitamente
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Benefícios rápidos */}
            {[
              'Orientações nutricionais personalizadas',
              'Chat direto com a nutricionista',
              'Cardápio adaptado ao seu tratamento',
            ].map(item => (
              <View key={item} style={styles.benefit}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.benefitText}>{item}</Text>
              </View>
            ))}

            <View style={styles.formDivider}>
              <View style={styles.divLine} />
            </View>
            <Text style={styles.label}>Nome completo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* E-mail */}
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Senha */}
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPass(p => !p)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Cadastrar */}
            <TouchableOpacity
              style={styles.btn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnText}>Criar minha conta</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Google */}
            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>ou cadastre com</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, loading && { opacity: 0.6 }]}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.googleLogo}>
                <Text style={styles.googleLogoText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Criar conta com o Google</Text>
            </TouchableOpacity>

            {/* Login */}
            <TouchableOpacity
              style={styles.loginRow}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginText}>
                Já tem conta? <Text style={styles.loginLink}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            Ao se cadastrar você concorda com nossos{' '}
            <Text style={styles.legalLink}>Termos de Uso</Text> e{' '}
            <Text style={styles.legalLink}>Política de Privacidade</Text>
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  backBtn: {
    marginTop: 52,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: { alignItems: 'center', paddingVertical: 24 },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heading: { fontSize: 24, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 14, color: '#6b7280', marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },

  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: { fontSize: 13, color: '#374151', flex: 1 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  eyeBtn: { padding: 4 },

  btn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  divLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  divText: { color: '#9ca3af', fontSize: 12 },
  formDivider: { marginVertical: 20 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 10,
    marginBottom: 12,
  },
  googleLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  googleLogoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  loginRow: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { color: '#16a34a', fontWeight: '700' },

  legal: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  legalLink: { color: '#16a34a', fontWeight: '600' },
});
