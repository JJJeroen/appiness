import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  getNotificationHour, setNotificationHour,
  getEnabledCategories, setEnabledCategories,
  getLanguagePreference, setLanguagePreference,
  ALL_CATEGORIES, LanguagePreference,
} from '../src/services/SettingsService';
import { scheduleDailyReminder } from '../src/services/NotificationService';
import * as Notifications from 'expo-notifications';
import { getGradient, colors, typography, Category } from '../src/theme';
import { useLocale } from '../src/hooks/useLocale';

const NOTIFICATION_HOURS = [7, 9, 12, 18, 21];

const CATEGORY_COLORS: Record<Category, string> = {
  relationships: '#C4956A',
  others:        '#C17A74',
  community:     '#7A9E9F',
  self:          '#9B8BBB',
};

const copy = {
  en: {
    title:         'Settings',
    langSection:   'Language',
    langAuto:      'Auto',
    langEN:        'English',
    langNL:        'Dutch',
    reminderSection: 'Daily reminder',
    reminderOff:   'Off',
    catSection:    'Categories',
    catLabels: {
      relationships: 'Relationships',
      others:        'Others',
      community:     'Community',
      self:          'Self',
    } as Record<Category, string>,
    legendSection: 'Colour guide',
    diffEasy:      'Light tint = easier mission',
    diffMedium:    'Medium tint = moderate',
    diffHard:      'Dark tint = more effort',
  },
  nl: {
    title:         'Instellingen',
    langSection:   'Taal',
    langAuto:      'Automatisch',
    langEN:        'Engels',
    langNL:        'Nederlands',
    reminderSection: 'Dagelijkse melding',
    reminderOff:   'Uit',
    catSection:    'Categorieën',
    catLabels: {
      relationships: 'Relaties',
      others:        'Anderen',
      community:     'Gemeenschap',
      self:          'Zelf',
    } as Record<Category, string>,
    legendSection: 'Kleuruitleg',
    diffEasy:      'Lichte tint = makkelijkere missie',
    diffMedium:    'Middeltint = gematigd',
    diffHard:      'Donkere tint = meer inspanning',
  },
};

export default function SettingsScreen() {
  const locale = useLocale();
  const t = copy[locale];

  const [langPref, setLangPref] = useState<LanguagePreference>('auto');
  const [notifHour, setNotifHour] = useState<number | null>(null); // null = off
  const [notifGranted, setNotifGranted] = useState(false);
  const [enabledCats, setEnabledCats] = useState<Category[]>([...ALL_CATEGORIES]);

  useEffect(() => {
    (async () => {
      const [pref, hour, cats, { status }] = await Promise.all([
        getLanguagePreference(),
        getNotificationHour(),
        getEnabledCategories(),
        Notifications.getPermissionsAsync(),
      ]);
      setLangPref(pref);
      setNotifHour(status === 'granted' ? hour : null);
      setNotifGranted(status === 'granted');
      setEnabledCats(cats);
    })();
  }, []);

  const handleLang = async (pref: LanguagePreference) => {
    setLangPref(pref);
    await setLanguagePreference(pref);
  };

  const handleNotifHour = async (hour: number) => {
    setNotifHour(hour);
    await setNotificationHour(hour);
    if (notifGranted) await scheduleDailyReminder();
  };

  const handleNotifOff = async () => {
    setNotifHour(null);
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const handleToggleCategory = async (cat: Category) => {
    const next = enabledCats.includes(cat)
      ? enabledCats.filter((c) => c !== cat)
      : [...enabledCats, cat];
    // Always keep at least one category enabled
    if (next.length === 0) return;
    setEnabledCats(next);
    await setEnabledCategories(next);
  };

  const gradient = getGradient('community', 'medium');

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

          {/* Language */}
          <Text style={styles.sectionLabel}>{t.langSection}</Text>
          <View style={styles.pillRow}>
            {(['auto', 'en', 'nl'] as LanguagePreference[]).map((pref) => (
              <TouchableOpacity
                key={pref}
                style={[styles.pill, langPref === pref && styles.pillActive]}
                onPress={() => handleLang(pref)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, langPref === pref && styles.pillTextActive]}>
                  {pref === 'auto' ? t.langAuto : pref === 'en' ? t.langEN : t.langNL}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reminder time */}
          <Text style={styles.sectionLabel}>{t.reminderSection}</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, notifHour === null && styles.pillActive]}
              onPress={handleNotifOff}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, notifHour === null && styles.pillTextActive]}>
                {t.reminderOff}
              </Text>
            </TouchableOpacity>
            {NOTIFICATION_HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.pill, notifHour === h && styles.pillActive]}
                onPress={() => handleNotifHour(h)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, notifHour === h && styles.pillTextActive]}>
                  {`${h}:00`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Categories */}
          <Text style={styles.sectionLabel}>{t.catSection}</Text>
          <View style={styles.catList}>
            {ALL_CATEGORIES.map((cat) => {
              const on = enabledCats.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catRow, !on && styles.catRowOff]}
                  onPress={() => handleToggleCategory(cat)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                  <Text style={[styles.catLabel, !on && styles.catLabelOff]}>
                    {t.catLabels[cat]}
                  </Text>
                  <View style={[styles.toggle, on && styles.toggleOn]}>
                    <Text style={styles.toggleText}>{on ? '✓' : ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Colour legend */}
          <Text style={styles.sectionLabel}>{t.legendSection}</Text>
          <View style={styles.legendGrid}>
            {ALL_CATEGORIES.map((cat) => (
              <View key={cat} style={styles.legendRow}>
                <View style={[styles.legendSwatch, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                <Text style={styles.legendCatLabel}>{t.catLabels[cat]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.difficultyHint}>
            <View style={styles.diffRow}>
              <View style={[styles.diffDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
              <Text style={styles.diffLabel}>{t.diffEasy}</Text>
            </View>
            <View style={styles.diffRow}>
              <View style={[styles.diffDot, { backgroundColor: 'rgba(255,255,255,0.85)' }]} />
              <Text style={styles.diffLabel}>{t.diffMedium}</Text>
            </View>
            <View style={styles.diffRow}>
              <View style={[styles.diffDot, { backgroundColor: 'rgba(255,255,255,1.0)' }]} />
              <Text style={styles.diffLabel}>{t.diffHard}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  scroll: { paddingBottom: 48 },

  header: { paddingTop: 12, paddingBottom: 24 },
  backButton: { marginBottom: 16 },
  backText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },

  sectionLabel: {
    ...typography.skipBadge,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 12,
  },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  pillText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  pillTextActive: { color: colors.text },

  catList: { gap: 4 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  catRowOff: { opacity: 0.45 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  catLabel: { flex: 1, ...typography.tip, color: colors.text },
  catLabelOff: { color: colors.textMuted },
  toggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  toggleText: { color: colors.text, fontSize: 13, fontWeight: '700' },

  legendGrid: { gap: 10, marginBottom: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendSwatch: { width: 20, height: 20, borderRadius: 4 },
  legendCatLabel: { ...typography.tip, color: colors.text, fontSize: 15 },
  difficultyHint: { gap: 8 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  diffLabel: { color: colors.textMuted, fontSize: 14 },
});
