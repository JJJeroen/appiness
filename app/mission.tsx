import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Mission, getTodaysMission, completeMission, skipMission,
  undoLastCompletion, getSkips, getStreak, getTotalCompletions,
  hasPromptedForNotification, markNotificationPrompted,
  deferMission, isDeferredToday, getStreakFreezes,
} from '../src/services/MissionService';
import { useLocale } from '../src/hooks/useLocale';
import { getGradient, colors, typography } from '../src/theme';
import { requestAndSchedule } from '../src/services/NotificationService';

const UNDO_WINDOW_MS = 5000;

type Milestone = { type: 'streak' | 'total'; value: number };

const STREAK_MILESTONES = new Set([7, 14, 30, 50, 100]);
const TOTAL_MILESTONES = new Set([10, 25, 50, 73, 90]);

function detectMilestone(streak: number, total: number): Milestone | null {
  if (STREAK_MILESTONES.has(streak)) return { type: 'streak', value: streak };
  if (TOTAL_MILESTONES.has(total)) return { type: 'total', value: total };
  return null;
}

const STREAK_COPY: Record<number, { en: string; nl: string }> = {
  7:   { en: 'days in a row. A streak freeze has been added.', nl: 'dagen op rij. Een streak-freeze is toegevoegd.' },
  14:  { en: 'days in a row. A habit is forming.', nl: 'dagen op rij. Een gewoonte is aan het ontstaan.' },
  30:  { en: 'days in a row. A real commitment.', nl: 'dagen op rij. Een echte toewijding.' },
  50:  { en: 'days in a row. Remarkable.', nl: 'dagen op rij. Opmerkelijk.' },
  100: { en: 'days in a row.', nl: 'dagen op rij.' },
};
const TOTAL_COPY: Record<number, { en: string; nl: string }> = {
  10:  { en: 'missions done. You\'re finding your footing.', nl: 'missies gedaan. Je vindt je weg.' },
  25:  { en: 'missions done. Kindness is becoming natural.', nl: 'missies gedaan. Vriendelijkheid wordt vanzelfsprekend.' },
  50:  { en: 'missions done. Halfway through the pool.', nl: 'missies gedaan. Halverwege de pool.' },
  73:  { en: 'missions done. A full cycle.', nl: 'missies gedaan. Een volledige ronde.' },
  90:  { en: 'missions done. Every single one.', nl: 'missies gedaan. Elke missie voltooid.' },
};

function getMilestoneLine(m: Milestone, locale: 'nl' | 'en'): string {
  const map = m.type === 'streak' ? STREAK_COPY : TOTAL_COPY;
  return map[m.value]?.[locale] ?? '';
}

export default function MissionScreen() {
  const locale = useLocale();
  const [mission, setMission] = useState<Mission | null | undefined>(undefined);
  const [skips, setSkips] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [isDeferred, setIsDeferred] = useState(false);
  const [freezes, setFreezes] = useState(0);
  const [lastCompletedMission, setLastCompletedMission] = useState<Mission | null>(null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMilestone = useRef<Milestone | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setShowTip(false);
    const [next, availableSkips, currentStreak, total, deferred, currentFreezes] = await Promise.all([
      getTodaysMission(),
      getSkips(),
      getStreak(),
      getTotalCompletions(),
      isDeferredToday(),
      getStreakFreezes(),
    ]);
    setMission(next);
    setSkips(availableSkips);
    setStreak(currentStreak);
    setTotalCompletions(total);
    setIsDeferred(deferred);
    setFreezes(currentFreezes);
    setLoading(false);
    setSubmitting(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Clean up undo timer on unmount
  useEffect(() => () => { if (undoTimeout.current) clearTimeout(undoTimeout.current); }, []);

  const handleDone = async () => {
    if (!mission || submitting) return;
    setSubmitting(true);
    setLastCompletedMission(mission);
    await completeMission(mission.id);
    const [newStreak, newTotal] = await Promise.all([getStreak(), getTotalCompletions()]);
    pendingMilestone.current = detectMilestone(newStreak, newTotal);
    setShowUndo(true);
    undoTimeout.current = setTimeout(() => {
      setShowUndo(false);
      setMilestone(pendingMilestone.current);
      load();
    }, UNDO_WINDOW_MS);
  };

  const handleUndo = async () => {
    if (undoTimeout.current) clearTimeout(undoTimeout.current);
    pendingMilestone.current = null;
    setShowUndo(false);
    setMilestone(null);
    await undoLastCompletion();
    load();
  };

  const handleSkip = async () => {
    if (!mission || skips <= 0 || submitting) return;
    setSubmitting(true);
    await skipMission(mission.id);
    load();
  };

  const handleDefer = async () => {
    if (!mission || submitting) return;
    setSubmitting(true);
    await deferMission(mission.id);
    load();
  };

  if (loading || mission === undefined) {
    return (
      <LinearGradient colors={getGradient('others', 'easy')} style={styles.container}>
        <ActivityIndicator color="#fff" size="large" />
      </LinearGradient>
    );
  }

  if (isDeferred) {
    return <CompletedTodayView locale={locale} streak={streak} totalCompletions={0} onNotificationPromptHandled={load} deferred />;
  }

  if (mission === null) {
    return (
      <CompletedTodayView
        locale={locale}
        streak={streak}
        totalCompletions={totalCompletions}
        onNotificationPromptHandled={load}
        lastMissionText={lastCompletedMission ? (locale === 'nl' ? lastCompletedMission.missionNL : lastCompletedMission.missionEN) : undefined}
        milestone={milestone}
      />
    );
  }

  const gradient = getGradient(mission.category, mission.difficulty);
  const missionText = locale === 'nl' ? mission.missionNL : mission.missionEN;
  const hintText = locale === 'nl' ? mission.hintNL : mission.hintEN;
  const canSkip = skips > 0;

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {streak > 0 ? (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            ) : (
              <View style={styles.dayOneBadge}>
                <Text style={styles.dayOneText}>{locale === 'nl' ? 'Dag 1' : 'Day 1'}</Text>
              </View>
            )}
            {freezes > 0 && (
              <View style={styles.freezeBadge}>
                <Ionicons name="snow" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.freezeText}>{freezes}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {canSkip && (
              <View style={styles.skipBadge}>
                <Text style={styles.skipBadgeText}>{skips} {skips === 1 ? 'skip' : 'skips'}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/history')} style={styles.historyButton}>
              <Text style={styles.historyButtonText}>{locale === 'nl' ? 'Historie' : 'History'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
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
                <Text style={styles.tipButtonText}>{locale === 'nl' ? 'Tip' : 'Tip'}</Text>
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

        <TouchableOpacity onPress={handleDefer} disabled={submitting} style={styles.notTodayButton}>
          <Text style={styles.notTodayText}>
            {locale === 'nl' ? 'Niet vandaag' : 'Not today'}
          </Text>
        </TouchableOpacity>

        {showUndo && (
          <TouchableOpacity style={styles.undoToast} onPress={handleUndo} activeOpacity={0.85}>
            <Text style={styles.undoText}>
              {locale === 'nl' ? 'Gemarkeerd als klaar — Ongedaan maken?' : 'Marked as done — Undo?'}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Completed today view ─────────────────────────────────────────────────────

function CompletedTodayView({
  locale, streak, totalCompletions, onNotificationPromptHandled, deferred = false,
  lastMissionText, milestone,
}: {
  locale: 'nl' | 'en';
  streak: number;
  totalCompletions: number;
  onNotificationPromptHandled: () => void;
  deferred?: boolean;
  lastMissionText?: string;
  milestone?: Milestone | null;
}) {
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const gradient = getGradient('self', 'medium');

  useEffect(() => {
    if (!deferred && totalCompletions === 1) {
      hasPromptedForNotification().then((already) => {
        if (!already) setShowNotifPrompt(true);
      });
    }
  }, [totalCompletions, deferred]);

  const handleEnableNotifications = async () => {
    await markNotificationPrompted();
    await requestAndSchedule();
    setShowNotifPrompt(false);
    onNotificationPromptHandled();
  };

  const handleDeclineNotifications = async () => {
    await markNotificationPrompted();
    setShowNotifPrompt(false);
    onNotificationPromptHandled();
  };

  const copy = {
    en: {
      well: deferred ? 'No worries.' : 'Well done.',
      body: deferred
        ? 'Come back tomorrow for your mission.'
        : streak > 1
          ? `${streak} days in a row. Come back tomorrow for your next mission.`
          : 'Come back tomorrow for your next mission.',
      history: 'See history',
      stats: 'Stats',
      notifQuestion: 'Want a daily reminder?',
      notifYes: 'Enable notifications',
      notifNo: 'No thanks',
    },
    nl: {
      well: deferred ? 'Geen probleem.' : 'Goed gedaan.',
      body: deferred
        ? 'Kom morgen terug voor je missie.'
        : streak > 1
          ? `${streak} dagen op rij. Kom morgen terug voor je volgende missie.`
          : 'Kom morgen terug voor je volgende missie.',
      history: 'Bekijk historie',
      stats: 'Statistieken',
      notifQuestion: 'Wil je een dagelijkse herinnering?',
      notifYes: 'Meldingen inschakelen',
      notifNo: 'Nee bedankt',
    },
  }[locale];

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.completedContainer}>
          {!deferred && streak > 1 && (
            <View style={styles.streakLarge}>
              <Ionicons name="flame" size={32} color="rgba(255,255,255,0.9)" />
              <Text style={styles.streakLargeNumber}>{streak}</Text>
            </View>
          )}
          {milestone && !deferred && (
            <View style={styles.milestoneBanner}>
              <Text style={styles.milestoneValue}>{milestone.value}</Text>
              <Text style={styles.milestoneLine}>{getMilestoneLine(milestone, locale)}</Text>
            </View>
          )}

          <Text style={styles.completedTitle}>{copy.well}</Text>

          {lastMissionText && !deferred && (
            <Text style={styles.completedMissionQuote}>{lastMissionText}</Text>
          )}

          <Text style={styles.completedBody}>{copy.body}</Text>

          {showNotifPrompt ? (
            <View style={styles.notifPrompt}>
              <Text style={styles.notifQuestion}>{copy.notifQuestion}</Text>
              <TouchableOpacity style={styles.notifYesButton} onPress={handleEnableNotifications} activeOpacity={0.8}>
                <Text style={styles.notifYesText}>{copy.notifYes}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeclineNotifications} style={styles.notifNoButton}>
                <Text style={styles.notifNoText}>{copy.notifNo}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.completedLinks}>
              <TouchableOpacity onPress={() => router.push('/history')} style={styles.historyLink}>
                <Text style={styles.historyLinkText}>{copy.history}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/stats')} style={styles.statsLinkButton}>
                <Text style={styles.statsLinkText}>{copy.stats}</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  dayOneBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayOneText: {
    ...typography.skipBadge,
    color: 'rgba(255,255,255,0.5)',
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(180,220,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freezeText: {
    ...typography.skipBadge,
    color: 'rgba(255,255,255,0.7)',
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
  settingsButton: { padding: 4 },
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

  notTodayButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  notTodayText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },

  undoToast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  undoText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
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
  milestoneBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    gap: 4,
  },
  milestoneValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 54,
  },
  milestoneLine: {
    ...typography.tip,
    color: colors.textMuted,
    textAlign: 'center',
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  completedMissionQuote: {
    ...typography.tip,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 12,
  },
  completedBody: {
    ...typography.tip,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 28,
  },
  completedLinks: {
    marginTop: 16,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  historyLink: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.doneBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  historyLinkText: {
    ...typography.button,
    color: colors.text,
    fontSize: 16,
  },
  statsLinkButton: { paddingVertical: 6 },
  statsLinkText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  notifPrompt: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  notifQuestion: {
    ...typography.tip,
    color: colors.textMuted,
    textAlign: 'center',
  },
  notifYesButton: {
    width: '100%',
    backgroundColor: colors.doneBg,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  notifYesText: {
    ...typography.button,
    color: colors.text,
    fontSize: 16,
  },
  notifNoButton: {
    paddingVertical: 8,
  },
  notifNoText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
});
