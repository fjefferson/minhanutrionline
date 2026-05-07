import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from './types';
import { useAuthStore } from '../store/auth.store';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainNavigator from './MainNavigator';
import AnamnesisNavigator from './AnamnesisNavigator';
import PlansScreen from '../screens/plans/PlansScreen';
import CheckoutScreen from '../screens/plans/CheckoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_KEY = '@minhanutrionline:onboarding';

export default function RootNavigator() {
  const { user, hydrate } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setLoading(false), 3000);
    (async () => {
      try {
        await hydrate();
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDone(done === 'done');
      } catch {
        // vai para onboarding por padrão
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0fdf4',
        }}
      >
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // Reativo: troca de stack automaticamente quando user muda
  if (user && !user.onboardingDone) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Anamnesis" component={AnamnesisNavigator} />
      </Stack.Navigator>
    );
  }

  if (user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="Plans" component={PlansScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={onboardingDone ? 'Login' : 'Onboarding'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
