import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category } from '../theme';

const KEYS = {
  notificationHour:  '@appiness/settings/notificationHour',
  enabledCategories: '@appiness/settings/enabledCategories',
  language:          '@appiness/settings/language',
};

export const ALL_CATEGORIES: Category[] = ['relationships', 'others', 'community', 'self'];

export async function getNotificationHour(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.notificationHour);
    return raw ? JSON.parse(raw) : 9;
  } catch { return 9; }
}

export async function setNotificationHour(hour: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.notificationHour, JSON.stringify(hour));
}

export async function getEnabledCategories(): Promise<Category[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.enabledCategories);
    const parsed: Category[] = raw ? JSON.parse(raw) : [...ALL_CATEGORIES];
    // Always return at least one — never leave the user with an empty pool
    return parsed.length > 0 ? parsed : [...ALL_CATEGORIES];
  } catch { return [...ALL_CATEGORIES]; }
}

export async function setEnabledCategories(categories: Category[]): Promise<void> {
  const safe = categories.length > 0 ? categories : [...ALL_CATEGORIES];
  await AsyncStorage.setItem(KEYS.enabledCategories, JSON.stringify(safe));
}

export type LanguagePreference = 'auto' | 'nl' | 'en';

export async function getLanguagePreference(): Promise<LanguagePreference> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.language);
    if (raw === 'nl' || raw === 'en') return raw;
    return 'auto';
  } catch { return 'auto'; }
}

export async function setLanguagePreference(lang: LanguagePreference): Promise<void> {
  await AsyncStorage.setItem(KEYS.language, lang);
}
