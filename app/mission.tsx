import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Mission, getNextMission, completeMission, skipMission, getSkips,
} from '../src/services/MissionService';
import { useLocale } from '../src/hooks/useLocale';
import { gradients, colors, typography } from '../src/theme';

function pickGradient(missionId: number): [string, string] {
  return gradients[missionId % gradients.length];
}

export default function MissionScreen() {
  const locale = useLocale();
  const [mission, setMission] = useState<Mission | null>(null);
  const [skips, setSkips] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setShowTip(false);
    const [next, availableSkips] = await Promise.all([getNextMission(), getSkips()]);
    setMission(next);
    setSkips(availableSkips);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDone = async () => {
    if (!mission) return;
    setLoading(true);
    await completeMission(mission.id);
    load();
  };

  const handleSkip = async () => {
    if (!mission || skips <= 0) return;
    setLoading(true);
    await skipMission(mission.id);
    load();
  };

  if (loading || !mission) {
    const gradient = mission ? pickGradient(mission.id) : gradients[0];
    return (
      <LinearGradient colors={gradient} style={styles.container}>
        <ActivityIndicator color="#fff" size="large" />
      </LinearGradient>
    );
  }

  const gradient = pickGradient(mission.id);
  const missionText = locale === 'nl' ? mission.missionNL : mission.missionEN;
  const hintText = locale === 'nl' ? mission.hintNL : mission.hintEN;
  const canSkip = skips > 0;

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/history')} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>{locale === 'nl' ? 'Historie' : 'History'}</Text>
          </TouchableOpacity>
          {skips > 0 && (
            <View style={styles.skipBadge}>
              <Text style={styles.skipBadgeText}>{skips} {locale === 'nl' ? 'sla over' : skips === 1 ? 'skip' : 'skips'}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.missionText}>{missionText}</Text>

          <View style={styles.tipContainer}>
            {showTip ? (
              <Text style={styles.tipText}>{hintText}</Text>
            ) : (
              <Pressable onPress={() => setShowTip(true)} style={styles.tipButton}>
                <Text style={styles.tipButtonText}>{locale === 'nl' ? '? Tip' : '? Tip'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.skipButton, !canSkip && styles.skipButtonDisabled]}
            onPress={handleSkip}
            disabled={!canSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, !canSkip && styles.skipTextDisabled]}>
              {locale === 'nl' ? 'Sla over' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneText}>{locale === 'nl' ? 'Gedaan' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  historyButton: { padding: 8 },
  historyButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
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
  doneText: {
    ...typography.button,
    color: colors.done,
  },
});
