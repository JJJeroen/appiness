import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  getHistory, getStreak, getBestStreak, getTotalCompletions,
  CompletedEntry, Mission,
} from '../src/services/MissionService';
import { useLocale } from '../src/hooks/useLocale';
import { getGradient, colors, typography, Category } from '../src/theme';

type HistoryEntry = CompletedEntry & { mission: Mission };

const CATEGORY_COLORS: Record<Category, string> = {
  relationships: '#C4956A',
  others:        '#C17A74',
  community:     '#7A9E9F',
  self:          '#9B8BBB',
};

const STREAK_MILESTONES = [7, 14, 30, 50, 100];
const TOTAL_MILESTONES = [10, 25, 50, 73, 90];

const copy = {
  en: {
    title:          'Stats',
    totalLabel:     'missions done',
    streakLabel:    'current streak',
    bestLabel:      'best streak',
    daysLabel:      'days',
    cats:           'By category',
    milestones:     'Milestones',
    streakMs:       (n: number) => `${n}-day streak`,
    totalMs:        (n: number) => `${n} missions`,
    catLabels: {
      relationships: 'Relationships',
      others:        'Others',
      community:     'Community',
      self:          'Self',
    } as Record<Category, string>,
  },
  nl: {
    title:          'Statistieken',
    totalLabel:     'missies gedaan',
    streakLabel:    'huidige streak',
    bestLabel:      'beste streak',
    daysLabel:      'dagen',
    cats:           'Per categorie',
    milestones:     'Mijlpalen',
    streakMs:       (n: number) => `${n}-daagse streak`,
    totalMs:        (n: number) => `${n} missies`,
    catLabels: {
      relationships: 'Relaties',
      others:        'Anderen',
      community:     'Gemeenschap',
      self:          'Zelf',
    } as Record<Category, string>,
  },
};

export default function StatsScreen() {
  const locale = useLocale();
  const t = copy[locale];

  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [catCounts, setCatCounts] = useState<Record<Category, number>>({
    relationships: 0, others: 0, community: 0, self: 0,
  });

  useEffect(() => {
    (async () => {
      const [totalCount, currentStreak, bestStreak, history] = await Promise.all([
        getTotalCompletions(),
        getStreak(),
        getBestStreak(),
        getHistory(),
      ]);
      setTotal(totalCount);
      setStreak(currentStreak);
      setBest(bestStreak);

      const counts: Record<Category, number> = { relationships: 0, others: 0, community: 0, self: 0 };
      (history as HistoryEntry[]).forEach((e) => { counts[e.mission.category]++; });
      setCatCounts(counts);
    })();
  }, []);

  const maxCat = Math.max(...Object.values(catCounts), 1);

  const gradient = getGradient('self', 'medium');

  return (
    <LinearGradient colors={gradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← {locale === 'nl' ? 'Terug' : 'Back'}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t.title}</Text>
          </View>

          {/* Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalNumber}>{total}</Text>
            <Text style={styles.totalLabel}>{t.totalLabel}</Text>
          </View>

          {/* Streaks */}
          <View style={styles.streakRow}>
            <View style={styles.streakCard}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>{t.streakLabel}</Text>
              <Text style={styles.streakDays}>{t.daysLabel}</Text>
            </View>
            <View style={styles.streakCard}>
              <Text style={styles.streakNumber}>{best}</Text>
              <Text style={styles.streakLabel}>{t.bestLabel}</Text>
              <Text style={styles.streakDays}>{t.daysLabel}</Text>
            </View>
          </View>

          {/* Category breakdown */}
          <Text style={styles.sectionLabel}>{t.cats}</Text>
          <View style={styles.catList}>
            {(Object.keys(catCounts) as Category[]).map((cat) => {
              const count = catCounts[cat];
              const pct = total > 0 ? count / total : 0;
              const barWidth = `${Math.round(pct * 100)}%`;
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catMeta}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                    <Text style={styles.catName}>{t.catLabels[cat]}</Text>
                    <Text style={styles.catCount}>{count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: CATEGORY_COLORS[cat], width: barWidth as unknown as number },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Milestones */}
          <Text style={styles.sectionLabel}>{t.milestones}</Text>
          <View style={styles.milestoneList}>
            {TOTAL_MILESTONES.map((n) => (
              <MilestoneRow key={`t${n}`} label={t.totalMs(n)} reached={total >= n} />
            ))}
            {STREAK_MILESTONES.map((n) => (
              <MilestoneRow key={`s${n}`} label={t.streakMs(n)} reached={best >= n} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MilestoneRow({ label, reached }: { label: string; reached: boolean }) {
  return (
    <View style={[msStyles.row, !reached && msStyles.rowLocked]}>
      <View style={[msStyles.check, reached && msStyles.checkDone]}>
        {reached && <Text style={msStyles.checkMark}>✓</Text>}
      </View>
      <Text style={[msStyles.label, !reached && msStyles.labelLocked]}>{label}</Text>
    </View>
  );
}

const msStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLocked: { opacity: 0.4 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.6)' },
  checkMark: { color: colors.text, fontSize: 13, fontWeight: '700' },
  label: { ...typography.tip, color: colors.text },
  labelLocked: { color: colors.textMuted },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  scroll: { paddingBottom: 48 },

  header: { paddingTop: 12, paddingBottom: 24 },
  backButton: { marginBottom: 16 },
  backText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },

  totalCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 28,
    marginBottom: 12,
  },
  totalNumber: { fontSize: 64, fontWeight: '700', color: colors.text, lineHeight: 70 },
  totalLabel: { ...typography.tip, color: colors.textMuted },

  streakRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  streakCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 2,
  },
  streakNumber: { fontSize: 36, fontWeight: '700', color: colors.text },
  streakLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
  streakDays: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 14,
  },

  catList: { gap: 12 },
  catRow: { gap: 8 },
  catMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, ...typography.tip, color: colors.text, fontSize: 15 },
  catCount: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },

  milestoneList: { gap: 2 },
});
