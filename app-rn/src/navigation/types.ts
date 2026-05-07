import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Glp1: undefined;
  Chat: undefined;
  Materials: undefined;
  Consultation: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Anamnesis: { returnTo?: keyof MainTabParamList } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Plans: undefined;
  Checkout: { planType: string };
};

export type AnamnesisStackParamList = {
  AnamnesisWelcome: undefined;
  AnamnesisPersonal: undefined;
  AnamnesisGlp1: undefined;
  AnamnesisHealth: undefined;
  AnamnesisPlans: { returnTo?: keyof MainTabParamList } | undefined;
};
