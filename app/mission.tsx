import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Mission, getTodaysMission, completeMission, skipMission, getSkips, getStreak,
} from '../src/services/MissionService';
import { useLocale } from '../src/hooks/useLocale';
import { getGradient, colors, typography } from '../src/theme';

export default function MissionScreen() {
  const locale = useLocale();
  const [mission, setMission] = useState<Mission | null | undefined>(undefined);
  const [skips, setSkips] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setShowTip(false);
    const [next, availableSkips, currentStreak] = await Promise.all([
      getTodaysMission(),
      getSkips(),
      getStreak(),
    ]);
    setMission(next);
    setSkips(availableSkips);
    setStreak(currentStreak);
    setLoading(false);
    setSubmitting(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDone = async () => {
    if (!mission || submitting) return;
    setSubmitting(true);
    await completeMission(mission.id);
    load();
  };

  const handleSkip = async () => {
    if (!mission || skips <= 0 || submitting) return;
    setSubmitting(true);
    await skipMission(mission.id);
    load();
  };

  // Loading state
  if (loading || mission === undefined) {
    return (
      <LinearGradient colors={getGradient('others', 'easy')} style={styles.container}>
        <ActivityIndicator color="#fff" size="large" />
      </LinearGradient>
    );
  }

  // Completed today — rest until tomorrow
  if (mission === null) {
    return <CompletedTodayView locale={locale} streak={streak} />;
  }

  const gradient = getGradient(mission.category, mission.difficulty);
  const missionText = locale === 'nl' ? mission.missionNL : mission.missionEN;
  const hintText = locale === 'nl' ? mission.hintNL : mission.hintEN;
  const canSkip = skips > 0;

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          {streak > 0 ? (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          ) : <View />}
          <View style={styles.headerRight}>
            {canSkip && (
              <View style={styles.skipBadge}>
                <Text style={styles.skipBadgeText}>{skips} {skips === 1 ? 'skip' : 'skips'}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/history')} style={styles.historyButton}>
              <Text style={styles.historyButtonText}>{locale === 'nl' ? 'Historie' : 'History'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.missionText}>{missionText}</Text>
          <View style={styles.tipContainer}>
            {showTip ? (
              <Text style={styles.tipText}>{hintText}</Text>
            ) : (
              <Pressable onPress={() => setShowTip(true)} style={styles.tipButton}>
                <Text style={styles.tipButtonText}>? Tip</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.skipButton, !canSkip && styles.skipButtonDisabled]}
            onPress={handleSkip}
            disabled={!canSkip || submitting}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, !canSkip && styles.skipTextDisabled]}>
              {locale === 'nl' ? 'Sla over' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.doneButton, submitting && styles.doneButtonSubmitting]}
            onPress={handleDone}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.doneText}>{locale === 'nl' ? 'Gedaan' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Completed today view ─────────────────────────────────────────────────────

function CompletedTodayView({ locale, streak }: { locale: 'nl' | 'en'; streak: number }) {
  const gradient = getGradient('self', 'medium');
  const copy = {
    en: {
      well: 'Well done.',
      body: streak > 1
        ? `${streak} days in a row. Come back tomorrow for your next mission.`
        : 'Come back tomorrow for your next mission.',
      history: 'See history',
    },
    nl: {
      well: 'Goed gedaan.',
      body: streak > 1
        ? `${streak} dagen op rij. Kom morgen terug voor je volgende missie.`
        : 'Kom morgen terug voor je volgende missie.',
      history: 'Bekijk historie',
    },
  }[locale];

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.completedContainer}>
          {streak > 1 && (
            <View style={styles.streakLarge}>
              <Ionicons name="flame" size={32} color="rgba(255,255,255,0.9)" />
              <Text style={styles.streakLargeNumber}>{streak}</Text>
            </View>
          )}
          <Text style={styles.completedTitle}>{copy.well}</Text>
          <Text style={styles.completedBody}>{copy.body}</Text>
          <TouchableOpacity onPress={() => router.push('/history')} style={styles.historyLink}>
            <Text style={styles.historyLinkText}>{copy.history}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakText: {
    ...typography.skipBadge,
    color: colors.text,
  },
  skipBadge: {
    backgroundColor: colors.skip,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  skipBadgeText: {
    ...typography.skipBadge,
    color: colors.text,
  },
  historyButton: { padding: 4 },
  historyButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },

  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 32,
  },
  missionText: {
    ...typography.mission,
    color: colors.text,
  },
  tipContainer: {
    minHeight: 80,
    justifyContent: 'flex-start',
  },
  tipButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tip,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tipButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  tipText: {
    ...typography.tip,
    color: colors.textMuted,
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  skipButton: {
    flex: 1,
    backgroundColor: colors.skip,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipButtonDisabled: {
    backgroundColor: colors.skipDisabled,
    borderColor: 'transparent',
  },
  skipText: {
    ...typography.button,
    color: colors.text,
    fontSize: 16,
  },
  skipTextDisabled: {
    color: colors.skipTextDisabled,
  },
  doneButton: {
    flex: 2,
    backgroundColor: colors.doneBg,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  doneButtonSubmitting: {
    opacity: 0.5,
  },
  doneText: {
    ...typography.button,
    color: colors.done,
  },

  // Completed today
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 12,
  },
  streakLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  streakLargeNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  completedBody: {
    ...typography.tip,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 28,
  },
  historyLink: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.doneBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  historyLinkText: {
    ...typography.button,
    color: colors.text,
    fontSize: 16,
  },
});
