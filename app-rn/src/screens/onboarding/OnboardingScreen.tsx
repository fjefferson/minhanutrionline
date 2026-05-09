import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'medical',
    title: 'Usa Ozempic, Wegovy\nou Mounjaro?',
    subtitle:
      'Quem usa canetas emagrecedoras precisa de um acompanhamento nutricional pensado especificamente para esse tratamento.',
    accent: '#16a34a',
  },
  {
    id: '2',
    icon: 'nutrition',
    title: 'Suporte nutricional\npara a sua jornada',
    subtitle:
      'Orientações personalizadas, chat com a nutricionista, registro de sintomas e cardápio adaptado ao seu tratamento.',
    accent: '#15803d',
  },
  {
    id: '3',
    icon: 'person-circle',
    title: 'Elane Oliveira\nCRN-14533',
    subtitle:
      'Nutricionista com foco em tratamentos GLP-1. Atende pacientes em todo o Brasil de forma 100% online.',
    accent: '#166534',
  },
];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      await AsyncStorage.setItem('@minhanutrionline:onboarding', 'done');
      navigation.replace('Login');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('@minhanutrionline:onboarding', 'done');
    navigation.replace('Login');
  };

  const renderItem: ListRenderItem<Slide> = ({ item, index }) => (
    <View style={styles.slide}>
      <LinearGradient
        colors={['#f0fdf4', '#dcfce7', '#ffffff']}
        style={styles.slideGradient}
      >
        {/* Icon circle */}
        <View
          style={[styles.iconCircle, { backgroundColor: item.accent + '18' }]}
        >
          <View style={[styles.iconInner, { backgroundColor: item.accent }]}>
            <Ionicons name={item.icon} size={42} color="#fff" />
          </View>
        </View>

        {/* Slide number indicator */}
        <Text style={[styles.slideNum, { color: item.accent }]}>
          {index + 1} / {slides.length}
        </Text>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={[
            styles.nextBtn,
            { backgroundColor: slides[activeIndex].accent },
          ]}
        >
          <Text style={styles.nextText}>
            {activeIndex === slides.length - 1 ? 'Começar' : 'Próximo'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  slide: { width, flex: 1 },
  slideGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  slideNum: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 18,
    marginTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: '#16a34a' },
  dotInactive: { width: 8, backgroundColor: '#bbf7d0' },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 8,
  },
  skipBtn: { padding: 12 },
  skipText: { color: '#6b7280', fontSize: 15, fontWeight: '500' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
