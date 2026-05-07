import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type {
  BottomTabNavigationProp,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/auth.store';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/dashboard/HomeScreen';
import Glp1Screen from '../screens/dashboard/Glp1Screen';
import ChatScreen from '../screens/dashboard/ChatScreen';
import MaterialsScreen from '../screens/dashboard/MaterialsScreen';
import ConsultationScreen from '../screens/dashboard/ConsultationScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const SCREEN_MAP: Record<string, React.ComponentType<any>> = {
  Home: HomeScreen,
  Glp1: Glp1Screen,
  Chat: ChatScreen,
  Materials: MaterialsScreen,
  Consultation: ConsultationScreen,
  Profile: ProfileScreen,
};

const TABS = [
  {
    name: 'Home' as const,
    label: 'Início',
    icon: 'home',
    iconOutline: 'home-outline',
  },
  {
    name: 'Glp1' as const,
    label: 'IA Nutri',
    icon: 'flash',
    iconOutline: 'flash-outline',
  },
  {
    name: 'Chat' as const,
    label: 'Chat',
    icon: 'chatbubble-ellipses',
    iconOutline: 'chatbubble-ellipses-outline',
  },
  {
    name: 'Materials' as const,
    label: 'Materiais',
    icon: 'library',
    iconOutline: 'library-outline',
  },
  {
    name: 'Consultation' as const,
    label: 'Consultas',
    icon: 'calendar',
    iconOutline: 'calendar-outline',
  },
] as const;

function HomeHeader() {
  const nav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user, logout } = useAuthStore();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] ?? 'Paciente';
  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        <View style={headerStyles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={headerStyles.avatar}
            />
          ) : (
            <LinearGradient
              colors={['#16a34a', '#15803d']}
              style={headerStyles.avatar}
            >
              <Text style={headerStyles.avatarText}>{initials}</Text>
            </LinearGradient>
          )}
          <View style={headerStyles.onlineDot} />
        </View>
        <View>
          <Text style={headerStyles.greetSmall}>{greeting},</Text>
          <Text style={headerStyles.greetName}>{firstName} 👋</Text>
        </View>
      </View>
      <View style={headerStyles.actions}>
        <TouchableOpacity
          style={headerStyles.iconBtn}
          onPress={() => nav.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={headerStyles.iconBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#f8fafc',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  greetSmall: { fontSize: 13, color: '#6b7280', fontWeight: '400' },
  greetName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 1,
  },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Esconder tab bar quando o teclado aparecer
    const kbs = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setVisible(false),
    );
    const kbh = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setVisible(true),
    );
    return () => {
      kbs.remove();
      kbh.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <View style={tabStyles.container}>
      {state.routes.map((route, index) => {
        // Ignora a aba de Perfil explicitamente se ela for oculta do menu
        if (route.name === 'Profile') return null;

        const { options } = descriptors[route.key];
        const tab = TABS.find(t => t.name === route.name);

        if (!tab) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            style={tabStyles.tabButton}
          >
            <View
              style={[
                tabStyles.iconWrap,
                isFocused && tabStyles.iconWrapActive,
              ]}
            >
              <Ionicons
                name={isFocused ? tab.icon : (tab.iconOutline as any)}
                size={22}
                color={isFocused ? '#16a34a' : '#9ca3af'}
              />
            </View>
            <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 35,
    elevation: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: '#dcfce7',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
  },
  labelActive: {
    color: '#16a34a',
    fontWeight: '800',
  },
});

export default function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: true,
          header: () => <HomeHeader />,
        }}
      />
      {TABS.filter(t => t.name !== 'Home').map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={SCREEN_MAP[tab.name]}
        />
      ))}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
