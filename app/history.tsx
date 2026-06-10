import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getHistory, CompletedEntry, Mission } from '../src/services/MissionService';
import { useLocale } from '../src/hooks/useLocale';
import { getGradient, colors, typography, Category } from '../src/theme';

type HistoryEntry = CompletedEntry & { mission: Mission };

const CATEGORY_COLORS: Record<Category, string> = {
  relationships: '#C4956A',
  others:        '#C17A74',
  community:     '#7A9E9F',
  self:          '#9B8BBB',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
  const locale = useLocale();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const empty = locale === 'nl'
    ? 'Doe een missie om je historie te zien.'
    : 'Complete a mission to see your history.';

  return (
    <LinearGradient colors={getGradient('community', 'medium')} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← {locale === 'nl' ? 'Terug' : 'Back'}</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{locale === 'nl' ? 'Historie' : 'History'}</Text>
            <TouchableOpacity onPress={() => router.push('/stats')} style={styles.statsLink}>
              <Text style={styles.statsLinkText}>{locale === 'nl' ? 'Statistieken' : 'Stats'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{empty}</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => `${item.missionId}-${item.completionDate}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View
                  style={[styles.categoryBar, { backgroundColor: CATEGORY_COLORS[item.mission.category] }]}
                />
                <Text style={styles.date}>{formatDate(item.completionDate)}</Text>
                <Text style={styles.mission} numberOfLines={2}>
                  {locale === 'nl' ? item.mission.missionNL : item.mission.missionEN}
                </Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },

  header: { paddingTop: 12, paddingBottom: 20 },
  backButton: { marginBottom: 16 },
  backText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },
  statsLink: { paddingBottom: 4 },
  statsLinkText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...typography.tip, color: colors.textMuted, textAlign: 'center' },

  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  categoryBar: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 20,
  },
  date: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    width: 36,
    paddingTop: 2,
  },
  mission: {
    flex: 1,
    ...typography.tip,
    color: colors.text,
  },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
});
