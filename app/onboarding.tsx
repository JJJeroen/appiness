import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../src/hooks/useLocale';
import { gradients, colors, typography } from '../src/theme';

const copy = {
  en: {
    title: 'Appiness',
    p1: 'Everyone can show goodness. Appiness gives you a simple, playful nudge in the right direction.',
    p2: 'Do missions and your life becomes more meaningful — you give others positive strength, and you become a better, healthier person.',
    p3: 'Take as long as you want. Skip one if you need to. No prior knowledge required.',
    cta: 'Start',
  },
  nl: {
    title: 'Appiness',
    p1: 'Iedereen kan goedheid tonen. Appiness geeft je op een makkelijke en speelse manier net dat duwtje in de goede richting.',
    p2: 'Voer missies uit en je leven krijgt meer betekenis — je vult anderen met positieve kracht, en je wordt er zelf een beter en gezonder mens van.',
    p3: 'Doe er zo lang je wilt over. Sla er een over als dat nodig is. Geen voorkennis vereist.',
    cta: 'Begin',
  },
};

export default function OnboardingScreen() {
  const locale = useLocale();
  const t = copy[locale];
  const gradient = gradients[0];

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.body}>{t.p1}</Text>
          <Text style={styles.body}>{t.p2}</Text>
          <Text style={styles.body}>{t.p3}</Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => router.replace('/mission')}
        >
          <Text style={styles.buttonText}>{t.cta}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 40 },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  body: {
    ...typography.tip,
    color: colors.text,
    marginBottom: 20,
    opacity: 0.9,
  },
  button: {
    backgroundColor: colors.doneBg,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: {
    ...typography.button,
    color: colors.text,
  },
});
