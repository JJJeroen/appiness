import { getLocales } from 'expo-localization';

export type Locale = 'nl' | 'en';

export function useLocale(): Locale {
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return locale === 'nl' ? 'nl' : 'en';
}
