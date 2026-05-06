import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/dashboard/HomeScreen';
import Glp1Screen from '../screens/dashboard/Glp1Screen';
import ChatScreen from '../screens/dashboard/ChatScreen';
import MaterialsScreen from '../screens/dashboard/MaterialsScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const SCREEN_MAP: Record<string, React.ComponentType<any>> = {
  Home: HomeScreen,
  Glp1: Glp1Screen,
  Chat: ChatScreen,
  Materials: MaterialsScreen,
  Profile: ProfileScreen,
};

const TABS = [
  { name: 'Home' as const, label: 'Início', icon: 'home' },
  { name: 'Glp1' as const, label: 'IA Nutri', icon: 'flash' },
  { name: 'Chat' as const, label: 'Chat', icon: 'chatbubble-ellipses' },
  { name: 'Materials' as const, label: 'Materiais', icon: 'library' },
  { name: 'Profile' as const, label: 'Perfil', icon: 'person' },
] as const;

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const tab = TABS.find(t => t.name === route.name);
          return (
            <Ionicons
              name={(tab?.icon ?? 'home') as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      {TABS.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={SCREEN_MAP[tab.name]}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </Tab.Navigator>
  );
}
