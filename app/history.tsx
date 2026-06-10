import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getHistory, CompletedEntry, Mission } from '../src/services/MissionService';
import { useLocale } from '../src/hooks/useLocale';
import { getGradient, colors, typography } from '../src/theme';

type HistoryEntry = CompletedEntry & { mission: Mission };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}-${d.getMonth() + 1}`;
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
          <Text style={styles.title}>{locale === 'nl' ? 'Historie' : 'History'}</Text>
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

  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: { marginBottom: 16 },
  backText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.tip,
    color: colors.textMuted,
    textAlign: 'center',
  },

  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 12,
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
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
