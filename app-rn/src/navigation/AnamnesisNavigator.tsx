import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnamnesisStackParamList, RootStackParamList } from './types';

import AnamnesisWelcome from '../screens/anamnesis/AnamnesisWelcome';
import AnamnesisPersonal from '../screens/anamnesis/AnamnesisPersonal';
import AnamnesisGlp1 from '../screens/anamnesis/AnamnesisGlp1';
import AnamnesisHealth from '../screens/anamnesis/AnamnesisHealth';
import AnamnesisPlans from '../screens/anamnesis/AnamnesisPlans';

const Stack = createNativeStackNavigator<AnamnesisStackParamList>();

type Props = NativeStackScreenProps<RootStackParamList, 'Anamnesis'>;

export default function AnamnesisNavigator({ route }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AnamnesisWelcome" component={AnamnesisWelcome} />
      <Stack.Screen name="AnamnesisPersonal" component={AnamnesisPersonal} />
      <Stack.Screen name="AnamnesisGlp1" component={AnamnesisGlp1} />
      <Stack.Screen name="AnamnesisHealth" component={AnamnesisHealth} />
      <Stack.Screen
        name="AnamnesisPlans"
        component={AnamnesisPlans}
        initialParams={{ returnTo: route.params?.returnTo }}
      />
    </Stack.Navigator>
  );
}
