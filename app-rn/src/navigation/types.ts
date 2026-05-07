export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Anamnesis: undefined;
  Main: undefined;
  Plans: undefined;
  Checkout: { planType: string };
};

export type AnamnesisStackParamList = {
  AnamnesisWelcome: undefined;
  AnamnesisPersonal: undefined;
  AnamnesisGlp1: undefined;
  AnamnesisHealth: undefined;
  AnamnesisPlans: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Glp1: undefined;
  Chat: undefined;
  Materials: undefined;
  Consultation: undefined;
  Profile: undefined;
};
